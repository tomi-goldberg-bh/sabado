import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Trash2, CheckCircle2, Clock, FolderOpen, Download, History, Loader } from 'lucide-react';
import { archivoService } from '../services/archivoService';
import { recentNamesService } from '../services/recentNamesService';
import { sociosSheetService } from '../services/sociosSheetService';
import { syncService } from '../services/syncService';
import { ArchivoBrowser } from './ArchivoBrowser';

export const SociosView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [allRecords, setAllRecords] = useState(() => archivoService.getAllRecords());
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [showArchivo, setShowArchivo] = useState(false);
  const [sheetSocios, setSheetSocios] = useState(() => sociosSheetService.getCachedSocios());
  const [loading, setLoading] = useState(true);

  const wrapperRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    sociosSheetService.fetchSocios().then(socios => {
      if (mounted) {
        setSheetSocios(socios);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    syncService.connect();
    const unsub = syncService.subscribe((event, data) => {
      if (event === 'init') {
        setAllRecords(data.records || {});
      } else if (event === 'new_record') {
        const { record } = data;
        if (record.tipo === 'socio') {
          setAllRecords(prev => {
            const date = data.date || Object.keys(prev).sort().pop() || archivoService.getTodayKey();
            const next = { ...prev };
            if (!next[date]) next[date] = [];
            const idx = next[date].findIndex(r => r.id === record.id);
            if (idx >= 0) next[date][idx] = record;
            else next[date] = [record, ...next[date]];
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
          return next;
        });
      } else if (event === 'day_closed') {
        const { date } = data;
        if (date) alert(`El día ${date} fue cerrado por otro dispositivo.`);
      }
    });
    return () => { unsub(); syncService.disconnect(); };
  }, []);

  const socioRecords = useMemo(() => {
    const result = {};
    for (const [date, records] of Object.entries(allRecords)) {
      const socios = records.filter(r => r.tipo === 'socio');
      if (socios.length > 0) result[date] = socios;
    }
    return result;
  }, [allRecords]);

  const dateKeys = useMemo(() => {
    return Object.keys(socioRecords).sort((a, b) => {
      const [d1, m1, y1] = a.split('-').map(Number);
      const [d2, m2, y2] = b.split('-').map(Number);
      return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
    });
  }, [socioRecords]);

  const totalCount = useMemo(() => {
    return Object.values(socioRecords).reduce((sum, arr) => sum + arr.length, 0);
  }, [socioRecords]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions([]);
    } else {
      const lower = searchTerm.toLowerCase();
      const fromSheet = sheetSocios
        .filter(s => s.name.toLowerCase().includes(lower))
        .slice(0, 10)
        .map(s => ({ id: `sheet-${s.name}`, name: s.name, tipo: s.tipo, isSheet: true }));
      const sheetNames = new Set(fromSheet.map(s => s.name.toLowerCase()));
      const fromRecent = recentNamesService
        .searchNames(searchTerm)
        .filter(name => !sheetNames.has(name.toLowerCase()))
        .slice(0, 3);
      const recentItems = fromRecent.map(n => ({ id: `recent-${n}`, name: n, isRecent: true }));
      setFilteredOptions([...fromSheet, ...recentItems]);
    }
  }, [searchTerm, sheetSocios]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelectSocio = (socio) => {
    const today = archivoService.getTodayKey();
    const todaySocios = socioRecords[today] || [];
    const exists = todaySocios.some(r => r.name.toLowerCase() === socio.name.toLowerCase());
    if (!exists) {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const entry = {
        id,
        tipo: 'socio',
        socioOriginalId: socio.isRecent ? null : socio.id,
        name: socio.name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      archivoService.saveRecord(entry);
      syncService.saveRecord(entry);
      recentNamesService.addName(socio.name);
      setAllRecords(archivoService.getAllRecords());
    }
    setSearchTerm('');
    setShowOptions(false);
  };

  const handleRemove = (id) => {
    archivoService.deleteRecord(id);
    syncService.deleteRecord(id);
    setAllRecords(archivoService.getAllRecords());
  };

  const handleCloseDay = () => {
    const success = archivoService.downloadTodayReport();
    if (success) {
      syncService.closeDay(archivoService.getTodayKey());
    } else {
      alert('No hay registros hoy para exportar.');
    }
  };

  const formatDateLabel = (key) => {
    const [d, m, y] = key.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <>
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-black text-brand-blue mb-2 tracking-tight">Ingreso de Socios</h2>
            <p className="text-brand-grey">Busca el nombre del socio para registrar su entrada.</p>
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

      <div className="relative mb-10 z-20" ref={wrapperRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full bg-white border border-slate-200 text-brand-grey rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all placeholder-slate-400 text-lg shadow-sm"
            placeholder={loading ? 'Cargando socios...' : 'Buscar por nombre o apellido...'}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowOptions(true);
            }}
            onFocus={() => setShowOptions(true)}
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400 text-sm">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Cargando...</span>
            </div>
          )}
        </div>

        {showOptions && filteredOptions.length > 0 && (
          <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30">
            <ul className="max-h-60 overflow-y-auto py-2">
              {filteredOptions.map((socio) => (
                <li
                  key={socio.id}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-brand-grey transition-colors flex items-center justify-between group"
                  onClick={() => handleSelectSocio(socio)}
                >
                  <span className="flex items-center gap-2">
                    {socio.isRecent && <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    {socio.isSheet && <span className="text-[10px] font-bold text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded shrink-0">{socio.tipo?.replace('Socio ', '') || 'Socio'}</span>}
                    <span className="font-medium text-lg">{socio.name}</span>
                  </span>
                  <span className="text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sm font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Registrar
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-0">
        <h3 className="text-xl font-bold text-brand-grey mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-blue" />
          Registros de Socios
          <span className="ml-auto bg-brand-light text-slate-500 text-xs py-1 px-3 rounded-full border border-slate-200">
            {totalCount} en total
          </span>
        </h3>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {totalCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
              <p>Aún no hay registros de socios</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dateKeys.map((date) => (
                <div key={date}>
                  <h4 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-2 sticky top-0 bg-white py-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateLabel(date)}
                    <span className="text-xs font-normal text-slate-400">({socioRecords[date].length})</span>
                  </h4>
                  <ul className="space-y-2">
                    {socioRecords[date].map((person) => (
                      <li key={person.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all hover:-translate-y-0.5">
                        <div>
                          <p className="text-brand-grey font-bold text-lg">{person.name}</p>
                          <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5 font-medium">
                            <Clock className="w-3 h-3" /> {person.time}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(person.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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

      {showArchivo && <ArchivoBrowser onClose={() => setShowArchivo(false)} initialFilter="socio" />}
    </>
  );
};
