import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Trash2, CheckCircle2, Clock, Wallet, Smartphone, Plus, DollarSign, FolderOpen, Download, History, Users, X, Loader, Calculator } from 'lucide-react';
import { archivoService } from '../services/archivoService';
import { recentNamesService } from '../services/recentNamesService';
import { nosociosSheetService } from '../services/nosociosSheetService';
import { syncService } from '../services/syncService';
import { ArchivoBrowser } from './ArchivoBrowser';
import clsx from 'clsx';

const GROUPS = [
  'Shaiajut', 'Metailim', 'Zoharim', 'Mekorim', 'Otzar', 'Akebot',
  'Iedidim', 'Shebibim', 'Balagan', 'Mejubar', 'Neshama', 'Alufim',
  'Jazak', 'Anakim'
];

const GROUPS_LOWER = new Set(GROUPS.map(g => g.toLowerCase()));

function normalizeGroup(g) {
  return g.trim().toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
}

function matchGroup(sheetGroup) {
  const norm = normalizeGroup(sheetGroup);
  if (!norm) return null;
  for (const g of GROUPS) {
    if (g.toLowerCase() === norm) return g;
  }
  const matching = GROUPS.find(g => g.toLowerCase().includes(norm) || norm.includes(g.toLowerCase()));
  return matching || null;
}

const PRICE_OPTIONS = [
  { key: 'peula', label: 'Peula', amount: 8000 },
  { key: 'peula_taller', label: 'Peula + Taller', amount: 9500 },
  { key: 'peula_2_hermanos', label: 'Peula 2 hermanos', amount: 15200 },
  { key: 'peula_hermano_x1', label: 'Peula hermano x1', amount: 7200 },
  { key: 'peula_2_hermanos_1_taller', label: 'Peula 2 hermanos + 1 Taller', amount: 16700 },
  { key: 'peula_2_hermanos_2_talleres', label: 'Peula 2 hermanos + 2 talleres', amount: 18200 },
  { key: 'peula_3_hermanos', label: 'Peula 3 hermanos', amount: 22400 },
  { key: 'otro', label: 'Otro monto (Manual)', amount: null },
];

const STORAGE_KEY = 'nosocios_registros';

const todayKey = () => new Date().toISOString().split('T')[0];

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveToStorage = (records) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage full or unavailable
  }
};

const formatAmount = (amount) => {
  if (amount == null || amount === '') return '';
  return `$${Number(amount).toLocaleString('es-AR')}`;
};

export const NoSociosView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [allRecords, setAllRecords] = useState(loadFromStorage);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedPriceKey, setSelectedPriceKey] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [showArchivo, setShowArchivo] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrev, setCalcPrev] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcReset, setCalcReset] = useState(false);
  const [sheetData, setSheetData] = useState(() => nosociosSheetService.getCachedSocios());
  const [loadingSheet, setLoadingSheet] = useState(true);

  const wrapperRef = useRef(null);

  const amount = useMemo(() => {
    if (selectedPriceKey === 'otro') {
      const parsed = parseFloat(customAmount.replace(/[^0-9]/g, ''));
      return isNaN(parsed) ? '' : parsed;
    }
    const option = PRICE_OPTIONS.find(o => o.key === selectedPriceKey);
    return option ? option.amount : '';
  }, [selectedPriceKey, customAmount]);

  const dateKeys = useMemo(() => {
    return Object.keys(allRecords).sort((a, b) => b.localeCompare(a));
  }, [allRecords]);

  const totalCount = useMemo(() => {
    return Object.values(allRecords).reduce((sum, arr) => sum + arr.length, 0);
  }, [allRecords]);

  useEffect(() => {
    let mounted = true;
    setLoadingSheet(true);
    nosociosSheetService.fetchSocios().then(data => {
      if (mounted) {
        setSheetData(data);
        setLoadingSheet(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions([]);
    } else {
      const lower = searchTerm.toLowerCase();
      const selectedSet = new Set(selectedNames.map(s => s.name.toLowerCase()));
      const fromSheet = sheetData
        .filter(s => s.name.toLowerCase().includes(lower) && !selectedSet.has(s.name.toLowerCase()))
        .slice(0, 8)
        .map(s => ({ id: `sheet-${s.name}`, name: s.name, grupo: s.grupo, isSheet: true }));
      const fromRecent = recentNamesService
        .searchNames(searchTerm)
        .filter(name => !selectedSet.has(name.toLowerCase()) && !fromSheet.some(fs => fs.name.toLowerCase() === name.toLowerCase()))
        .slice(0, 3);
      const recentItems = fromRecent.map(n => ({ id: `recent-${n}`, name: n, isRecent: true }));
      setFilteredOptions([...fromSheet, ...recentItems]);
    }
  }, [searchTerm, sheetData, selectedNames]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    syncService.connect();
    const unsub = syncService.subscribe((event, data) => {
      if (event === 'init') {
        setAllRecords(data.records || {});
        saveToStorage(data.records || {});
      } else if (event === 'new_record') {
        const { record } = data;
        if (record.tipo === 'no_socio') {
          setAllRecords(prev => {
            const date = data.date || Object.keys(prev).sort().pop() || todayKey();
            const next = { ...prev };
            if (!next[date]) next[date] = [];
            const idx = next[date].findIndex(r => r.id === record.id);
            if (idx >= 0) next[date][idx] = record;
            else next[date] = [record, ...next[date]];
            saveToStorage(next);
            return next;
          });
        }
      } else if (event === 'deleted_record') {
        const { id } = data;
        setAllRecords(prev => {
          const next = { ...prev };
          for (const date of Object.keys(next)) {
            next[date] = next[date].filter(r => r.id !== id);
            if (next[date].length === 0) delete next[date];
          }
          saveToStorage(next);
          return next;
        });
      } else if (event === 'day_closed') {
        const { date } = data;
        if (date) alert(`El día ${date} fue cerrado por otro dispositivo.`);
      }
    });
    return () => { unsub(); syncService.disconnect(); };
  }, []);

  const toggleGroup = (group) => {
    setSelectedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const handlePriceSelect = (key) => {
    setSelectedPriceKey(key);
    if (key !== 'otro') {
      setCustomAmount('');
    }
  };

  const handleSelectOption = (opt) => {
    const name = opt.name;
    const alreadySelected = selectedNames.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (alreadySelected) {
      setSearchTerm('');
      setShowOptions(false);
      return;
    }

    const newEntry = { name };

    if (opt.isSheet && opt.grupo) {
      const matched = matchGroup(opt.grupo);
      if (matched && !selectedGroups.includes(matched)) {
        setSelectedGroups(prev => [...prev, matched]);
      }
    }

    setSelectedNames(prev => [...prev, newEntry]);
    setSearchTerm('');
    setShowOptions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = searchTerm.trim();
      if (!text) return;
      const already = selectedNames.some(s => s.name.toLowerCase() === text.toLowerCase());
      if (already) {
        setSearchTerm('');
        setShowOptions(false);
        return;
      }
      setSelectedNames(prev => [...prev, { name: text }]);
      setSearchTerm('');
      setShowOptions(false);
    }
  };

  const handleRemoveName = (index) => {
    setSelectedNames(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegister = () => {
    const pendingText = searchTerm.trim();
    if (selectedNames.length === 0 && !pendingText) return;
    if (!paymentMethod) {
      alert('Por favor selecciona un método de pago.');
      return;
    }
    if (!selectedPriceKey) {
      alert('Por favor selecciona un costo.');
      return;
    }
    if (selectedPriceKey === 'otro' && (!customAmount || parseFloat(customAmount.replace(/[^0-9]/g, '')) <= 0)) {
      alert('Por ingresa un monto válido.');
      return;
    }

    const names = selectedNames.map(s => s.name);
    if (pendingText && !names.some(n => n.toLowerCase() === pendingText.toLowerCase())) {
      names.push(pendingText);
    }
    const joinedName = names.join(' + ');
    names.forEach(n => recentNamesService.addName(n));

    const today = todayKey();
    const entry = {
      id: Date.now(),
      tipo: 'no_socio',
      name: joinedName,
      names: names,
      groups: selectedGroups,
      payment: paymentMethod,
      priceKey: selectedPriceKey,
      amount: amount,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    archivoService.saveRecord(entry);
    syncService.saveRecord(entry);

    const updated = { ...allRecords };
    if (!updated[today]) updated[today] = [];
    updated[today] = [entry, ...updated[today]];
    setAllRecords(updated);
    saveToStorage(updated);

    setSearchTerm('');
    setSelectedNames([]);
    setPaymentMethod('');
    setSelectedGroups([]);
    setSelectedPriceKey('');
    setCustomAmount('');
    setShowOptions(false);
  };

  const handleRemove = (id) => {
    archivoService.deleteRecord(id);
    syncService.deleteRecord(id);
    const updated = { ...allRecords };
    for (const date of Object.keys(updated)) {
      updated[date] = updated[date].filter(r => r.id !== id);
      if (updated[date].length === 0) delete updated[date];
    }
    setAllRecords(updated);
    saveToStorage(updated);
  };

  const handleCloseDay = () => {
    const success = archivoService.downloadTodayReport();
    if (success) {
      syncService.closeDay(archivoService.getTodayKey());
    } else {
      alert('No hay registros hoy para exportar.');
    }
  };

  const calc = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 'Error';
      default: return b;
    }
  };

  const handleCalcNumber = (num) => {
    setCalcDisplay(prev => {
      if (prev === 'Error') return String(num);
      if (calcReset) {
        setCalcReset(false);
        return String(num);
      }
      return prev === '0' ? String(num) : prev + num;
    });
  };

  const handleCalcDecimal = () => {
    setCalcDisplay(prev => {
      if (prev === 'Error') return '0.';
      if (calcReset) {
        setCalcReset(false);
        return '0.';
      }
      return prev.includes('.') ? prev : prev + '.';
    });
  };

  const handleCalcOperator = (op) => {
    const current = parseFloat(calcDisplay);
    if (calcPrev !== null && calcOp && !calcReset) {
      const result = calc(calcPrev, current, calcOp);
      setCalcDisplay(result === 'Error' ? 'Error' : String(result));
      setCalcPrev(result === 'Error' ? null : result);
    } else {
      setCalcPrev(current);
    }
    setCalcOp(op);
    setCalcReset(true);
  };

  const handleCalcEquals = () => {
    if (calcPrev !== null && calcOp) {
      const current = parseFloat(calcDisplay);
      const result = calc(calcPrev, current, calcOp);
      setCalcDisplay(result === 'Error' ? 'Error' : String(result));
      setCalcPrev(null);
      setCalcOp(null);
      setCalcReset(true);
    }
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcPrev(null);
    setCalcOp(null);
    setCalcReset(false);
  };

  const handleCalcBackspace = () => {
    setCalcDisplay(prev => {
      if (prev === 'Error') return '0';
      const next = prev.slice(0, -1);
      return next === '' || next === '-' ? '0' : next;
    });
  };

  const handleCalcUseResult = () => {
    const val = calcDisplay;
    if (val !== 'Error' && val !== '0') {
      setCustomAmount(val.replace('.', ','));
    } else {
      setCustomAmount(val.replace('.', ','));
    }
    setSelectedPriceKey('otro');
    setShowCalculator(false);
  };

  const formatDateLabel = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <>
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-4 md:p-6 overflow-y-auto animate-in fade-in duration-500">
      <div className="mb-6 md:mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-brand-blue mb-2 tracking-tight">Ingreso de No Socios</h2>
            <p className="text-sm md:text-base text-brand-grey">Seleccioná uno o más nombres y asignales un mismo pago.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowArchivo(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-brand-grey hover:bg-slate-50 font-bold text-xs sm:text-sm rounded-xl transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Ver Archivos</span>
            </button>
            <button
              onClick={handleCloseDay}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Cerrar Día</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm mb-6 md:mb-8 z-20">

        <div className="relative mb-6" ref={wrapperRef}>
          <label className="block text-sm font-bold text-brand-grey mb-2">
            {selectedNames.length > 0 ? `Nombres seleccionados (${selectedNames.length})` : 'Nombre de la persona'}
          </label>

          {selectedNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedNames.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-sm font-bold px-2.5 py-1 rounded-lg">
                  <Users className="w-3 h-3 shrink-0" />
                  {s.name}
                  <button onClick={() => handleRemoveName(i)} className="ml-0.5 hover:bg-brand-blue/20 rounded p-0.5 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className={clsx(
                'w-full bg-slate-50 border border-slate-200 text-brand-grey rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all placeholder-slate-400 font-medium',
                loadingSheet && 'pr-32'
              )}
              placeholder={loadingSheet ? 'Cargando lista...' : selectedNames.length > 0 ? 'Agregar otro nombre...' : 'Buscar y seleccionar nombre...'}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowOptions(true);
              }}
              onFocus={() => setShowOptions(true)}
              onKeyDown={handleKeyDown}
            />
            {loadingSheet && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 text-xs">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Cargando...</span>
              </div>
            )}
          </div>

          {showOptions && (
            <>
              {filteredOptions.length > 0 ? (
                <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30">
                  <ul className="max-h-48 overflow-y-auto py-2">
                    {filteredOptions.map((opt) => (
                      <li
                        key={opt.id}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-brand-grey transition-colors flex items-center justify-between group"
                        onClick={() => handleSelectOption(opt)}
                      >
                        <span className="flex items-center gap-2 font-bold min-w-0">
                          {opt.isRecent && <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          {opt.isSheet && opt.grupo && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded shrink-0 leading-tight">
                              {normalizeGroup(opt.grupo)}
                            </span>
                          )}
                          <span className="truncate">{opt.name}</span>
                        </span>
                        <Plus className="w-4 h-4 text-brand-blue shrink-0 ml-2" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : searchTerm.trim() && (
                <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30 p-4 text-center">
                  <p className="text-sm text-slate-400">
                    Presioná <kbd className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs font-bold border border-slate-200">Enter</kbd> para agregar &ldquo;<span className="font-bold text-brand-grey">{searchTerm.trim()}</span>&rdquo;
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-brand-grey mb-3">Grupo(s)</label>
          <div className="flex flex-wrap gap-2">
            {GROUPS.map((group) => (
              <button
                key={group}
                onClick={() => toggleGroup(group)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200',
                  selectedGroups.includes(group)
                    ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue/40 hover:text-brand-blue'
                )}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-brand-grey mb-3">Costo</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PRICE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handlePriceSelect(opt.key)}
                className={clsx(
                  'px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all duration-200 text-left leading-tight',
                  selectedPriceKey === opt.key
                    ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span>{opt.label}</span>
                {opt.amount != null && (
                  <span className="block text-base mt-0.5">
                    ${opt.amount.toLocaleString('es-AR')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-brand-grey mb-2">Monto a cobrar</label>
          {selectedPriceKey === 'otro' ? (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                className="w-full bg-slate-50 border border-slate-200 text-brand-grey rounded-xl py-3 pl-12 pr-14 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all placeholder-slate-400 font-bold text-lg"
                placeholder="Ingresá el monto..."
                value={customAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9,]/g, '');
                  setCustomAmount(val);
                }}
              />
              <button
                onClick={() => setShowCalculator(true)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-brand-blue transition-colors"
                title="Calculadora"
                type="button"
              >
                <Calculator className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl py-3 px-4">
              <span className="text-2xl font-black text-brand-blue">
                {amount ? formatAmount(amount) : '—'}
              </span>
            </div>
          )}
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-brand-grey mb-3">Método de Pago</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPaymentMethod('efectivo')}
              className={clsx(
                'flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all duration-300 font-bold',
                paymentMethod === 'efectivo'
                  ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <Wallet className="w-6 h-6 mb-2" />
              <span>Efectivo</span>
            </button>
            <button
              onClick={() => setPaymentMethod('mercadopago')}
              className={clsx(
                'flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all duration-300 font-bold',
                paymentMethod === 'mercadopago'
                  ? 'bg-[#009EE3]/10 border-[#009EE3] text-[#009EE3]'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <Smartphone className="w-6 h-6 mb-2" />
              <span>Mercado Pago</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={(selectedNames.length === 0 && !searchTerm.trim()) || !paymentMethod || !selectedPriceKey}
          className="w-full bg-brand-blue hover:bg-brand-accent text-white font-black text-lg py-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {(() => {
            const total = selectedNames.length + (searchTerm.trim() && !selectedNames.some(s => s.name.toLowerCase() === searchTerm.trim().toLowerCase()) ? 1 : 0);
            if (total > 1) return `Registrar ${total} personas`;
            if (total === 1) return 'Registrar Entrada';
            return 'Seleccioná al menos un nombre';
          })()}
        </button>

      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
        <h3 className="text-xl font-bold text-brand-grey mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-blue" />
          Registros
          <span className="ml-auto bg-brand-light text-slate-500 text-xs py-1 px-3 rounded-full border border-slate-200">
            {totalCount} en total
          </span>
        </h3>

        <div>
          {totalCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
              <p>Aún no hay registros de no socios</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dateKeys.map((date) => (
                <div key={date}>
                  <h4 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-2 sticky top-0 bg-white py-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateLabel(date)}
                    <span className="text-xs font-normal text-slate-400">({allRecords[date].length})</span>
                  </h4>
                  <ul className="space-y-2">
                    {allRecords[date].map((person) => (
                      <li key={person.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all hover:-translate-y-0.5">
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                            {person.names && person.names.length > 1 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {person.names.map((n, i) => (
                                  <span key={i} className="text-brand-grey font-bold text-base md:text-lg">{n}{i < person.names.length - 1 ? <span className="text-slate-300 mx-0.5">+</span> : ''}</span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-brand-grey font-bold text-base md:text-lg">{person.name}</p>
                            )}
                            <span className={clsx(
                              'text-xs px-2 py-0.5 rounded-full border font-bold',
                              person.payment === 'efectivo'
                                ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
                                : 'bg-[#009EE3]/10 border-[#009EE3]/30 text-[#009EE3]'
                            )}>
                              {person.payment === 'efectivo' ? 'Efectivo' : 'Mercado Pago'}
                            </span>
                            {person.amount && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-bold">
                                {formatAmount(person.amount)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 mt-1 flex-wrap">
                            <span className="text-slate-500 text-xs md:text-sm flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" /> {person.time}
                            </span>
                            {person.groups && person.groups.length > 0 && (
                              <span className="text-xs text-slate-400 font-medium">
                                {person.groups.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(person.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100 shrink-0"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

      {showCalculator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowCalculator(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-bold text-brand-grey">Calculadora</span>
              <button
                onClick={() => setShowCalculator(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-right mb-3 min-h-[52px] flex items-center justify-end overflow-hidden">
                <span className="text-2xl font-black text-brand-grey truncate max-w-full">
                  {calcDisplay === 'Error' ? (
                    <span className="text-red-500">Error</span>
                  ) : (
                    new Intl.NumberFormat('es-AR').format(parseFloat(calcDisplay || '0'))
                  )}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button onClick={handleCalcClear} className="col-span-1 py-3 rounded-xl font-bold text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 transition-all">C</button>
                <button onClick={() => handleCalcOperator('/')} className="py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all">÷</button>
                <button onClick={() => handleCalcOperator('*')} className="py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all">×</button>
                <button onClick={handleCalcBackspace} className="py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all text-xs">⌫</button>

                <button onClick={() => handleCalcNumber(7)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">7</button>
                <button onClick={() => handleCalcNumber(8)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">8</button>
                <button onClick={() => handleCalcNumber(9)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">9</button>
                <button onClick={() => handleCalcOperator('-')} className="py-3 rounded-xl font-bold text-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all">−</button>

                <button onClick={() => handleCalcNumber(4)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">4</button>
                <button onClick={() => handleCalcNumber(5)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">5</button>
                <button onClick={() => handleCalcNumber(6)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">6</button>
                <button onClick={() => handleCalcOperator('+')} className="py-3 rounded-xl font-bold text-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all">+</button>

                <button onClick={() => handleCalcNumber(1)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">1</button>
                <button onClick={() => handleCalcNumber(2)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">2</button>
                <button onClick={() => handleCalcNumber(3)} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">3</button>
                <button onClick={handleCalcEquals} className="py-3 rounded-xl font-bold text-lg bg-brand-blue text-white border border-brand-blue hover:bg-brand-accent active:scale-95 transition-all">=</button>

                <button onClick={() => handleCalcNumber(0)} className="col-span-2 py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">0</button>
                <button onClick={handleCalcDecimal} className="py-3 rounded-xl font-bold text-base bg-white text-brand-grey border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">,</button>
                <button onClick={handleCalcClear} className="py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all">CE</button>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={handleCalcUseResult}
                className="w-full py-3 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-700 text-white active:scale-[0.98] transition-all"
              >
                Usar Resultado
              </button>
            </div>
          </div>
        </div>
      )}

      {showArchivo && <ArchivoBrowser onClose={() => setShowArchivo(false)} initialFilter="no_socio" />}
    </>
  );
};
