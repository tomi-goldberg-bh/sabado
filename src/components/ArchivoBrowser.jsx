import { useState, useMemo, useEffect } from 'react';
import { X, Download, Clock, FileText } from 'lucide-react';
import { archivoService } from '../services/archivoService';
import clsx from 'clsx';

export const ArchivoBrowser = ({ onClose, initialFilter }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [tipoFilter, setTipoFilter] = useState(initialFilter || 'todos');

  const [days, setDays] = useState([]);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loaded, setLoaded] = useState({ date: null, records: [] });
  const dayRecords = loaded.records;
  const loadingRecords = selectedDate !== null && loaded.date !== selectedDate;

  const dates = useMemo(() => days.map(d => d.date), [days]);
  const countByDate = useMemo(() => Object.fromEntries(days.map(d => [d.date, d.count || 0])), [days]);

  useEffect(() => {
    let mounted = true;
    archivoService.getAvailableDays()
      .then(list => { if (mounted) setDays(list); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingDays(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedDate) return undefined;
    let mounted = true;
    archivoService.getRecordsByDate(selectedDate)
      .then(list => { if (mounted) setLoaded({ date: selectedDate, records: list }); })
      .catch(() => { if (mounted) setLoaded({ date: selectedDate, records: [] }); });
    return () => { mounted = false; };
  }, [selectedDate]);

  const records = useMemo(() => {
    if (!selectedDate) return [];
    return dayRecords.filter(r => {
      if (tipoFilter === 'todos') return true;
      return r.tipo === tipoFilter;
    });
  }, [dayRecords, selectedDate, tipoFilter]);

  const formatDateLabel = (key) => {
    const [d, m, y] = key.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatAmount = (amount) => {
    if (amount == null || amount === '') return '';
    return `$${Number(amount).toLocaleString('es-AR')}`;
  };

  const handleExport = () => {
    if (records.length === 0) return;
    archivoService.exportToXLSX(records, `registros-${selectedDate}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col m-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-brand-blue" />
            <h2 className="text-2xl font-black text-brand-grey">Archivos Anteriores</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-56 border-r border-slate-200 p-4 overflow-y-auto flex-shrink-0 hidden md:block">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Fechas disponibles</p>
            {loadingDays ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : dates.length === 0 ? (
              <p className="text-sm text-slate-400">No hay archivos guardados.</p>
            ) : (
              <ul className="space-y-1">
                {dates.map(date => (
                  <li key={date}>
                    <button
                      onClick={() => setSelectedDate(date)}
                      className={clsx(
                        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        selectedDate === date
                          ? 'bg-brand-blue text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatDateLabel(date)}
                      </span>
                      <span className="text-xs opacity-70">
                        {countByDate[date]} registros
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
            {/* Mobile date selector */}
            <div className="md:hidden mb-4">
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-brand-grey"
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value || null)}
              >
                <option value="">Seleccionar fecha...</option>
                {dates.map(date => (
                  <option key={date} value={date}>
                    {formatDateLabel(date)} ({countByDate[date]} registros)
                  </option>
                ))}
              </select>
            </div>

            {selectedDate ? (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">Filtrar:</span>
                    {['todos', 'socio', 'no_socio'].map(t => (
                      <button
                        key={t}
                        onClick={() => setTipoFilter(t)}
                        className={clsx(
                          'px-3 py-1 rounded-full text-xs font-bold transition-colors',
                          tipoFilter === t
                            ? 'bg-brand-blue text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        )}
                      >
                        {t === 'todos' ? 'Todos' : t === 'socio' ? 'Socios' : 'No Socios'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={records.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Excel
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loadingRecords ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      <p>Cargando registros...</p>
                    </div>
                  ) : records.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      <p>No hay registros para esta fecha y filtro.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <th className="pb-3 pr-2">Nombre</th>
                            <th className="pb-3 pr-2">Tipo</th>
                            <th className="pb-3 pr-2 hidden sm:table-cell">Grupo(s)</th>
                            <th className="pb-3 pr-2">Monto</th>
                            <th className="pb-3 pr-2 hidden sm:table-cell">Pago</th>
                            <th className="pb-3">Hora</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {records.map(r => (
                            <tr key={r.id} className="text-slate-700">
                              <td className="py-3 pr-2 font-bold whitespace-nowrap">{r.name}</td>
                              <td className="py-3 pr-2">
                                <span className={clsx(
                                  'text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap',
                                  r.tipo === 'socio'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-purple-50 text-purple-700'
                                )}>
                                  {r.tipo === 'socio' ? 'Socio' : 'No Socio'}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-slate-500 hidden sm:table-cell">
                                {(r.groups || []).join(', ') || '—'}
                              </td>
                              <td className="py-3 pr-2 font-mono font-bold whitespace-nowrap">
                                {formatAmount(r.amount) || '—'}
                              </td>
                              <td className="py-3 pr-2 hidden sm:table-cell">
                                {r.payment === 'efectivo' ? 'Efectivo' : r.payment === 'mercadopago' ? 'Mercado Pago' : '—'}
                              </td>
                              <td className="py-3 text-slate-500 whitespace-nowrap">{r.time || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium">Seleccioná una fecha para ver sus registros</p>
                <p className="text-sm">o exportalos como CSV.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
