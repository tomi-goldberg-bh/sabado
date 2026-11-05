import { useState, useEffect, useMemo } from 'react';
import { CalendarCheck, Users, Loader, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { GROUPS, SIN_GRUPO, matchGroup } from '../config/groups';
import { presentismoService } from '../services/presentismoService';
import { nosociosSheetService } from '../services/nosociosSheetService';

const formatDateLabel = (key) => {
  const [d, m, y] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('es-AR', { weekday: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

export const PresentismoView = ({ profile }) => {
  const isAdmin = profile.role === 'admin';
  const [selectedGroup, setSelectedGroup] = useState(isAdmin ? GROUPS[0] : profile.group);
  const group = isAdmin ? selectedGroup : profile.group;

  const [result, setResult] = useState({ group: null, days: [], error: null });
  const [juventud, setJuventud] = useState(() => nosociosSheetService.getCachedSocios());

  useEffect(() => {
    let mounted = true;
    nosociosSheetService.fetchSocios().then(rows => { if (mounted && rows.length) setJuventud(rows); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    return presentismoService.subscribeGroup(
      group,
      (days) => setResult({ group, days, error: null }),
      (err) => setResult({ group, days: [], error: err }),
    );
  }, [group]);

  const loading = result.group !== group;
  const days = loading ? [] : result.days;

  // Cantidad de chicos del grupo según la planilla de juventud.
  const groupSize = useMemo(
    () => (group === SIN_GRUPO ? 0 : juventud.filter(r => matchGroup(r.grupo) === group).length),
    [juventud, group],
  );

  const average = days.length
    ? Math.round(days.reduce((sum, d) => sum + d.people.length, 0) / days.length)
    : 0;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-4 md:p-6 overflow-y-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-brand-blue mb-2 tracking-tight">Presentismo</h2>
        <p className="text-sm md:text-base text-brand-grey">
          {isAdmin
            ? 'Elegí un grupo para ver quiénes vinieron cada día.'
            : `Quiénes vinieron cada día a ${group}.`}
        </p>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2 mb-6">
          {[...GROUPS, SIN_GRUPO].map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-bold border transition-colors',
                g === group
                  ? 'bg-brand-blue border-brand-blue text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Días con registro" value={loading ? '—' : days.length} />
        <Stat label="Promedio por día" value={loading ? '—' : average} />
        <Stat label="Chicos en la lista" value={group === SIN_GRUPO ? '—' : groupSize} />
      </div>

      {result.error && !loading ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No se pudo cargar el presentismo. Revisá la conexión o pedile acceso a un administrador.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-16">
          <Loader className="w-5 h-5 animate-spin" /> Cargando...
        </div>
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-slate-400 py-16">
          <CalendarCheck className="w-12 h-12 mb-4 opacity-20" />
          <p>Todavía no hay asistencias registradas para {group}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map(day => (
            <section key={day.date} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-brand-grey mb-3">
                <CalendarCheck className="w-4 h-4 text-brand-blue" />
                {formatDateLabel(day.date)}
                <span className="ml-auto flex items-center gap-1 text-xs font-bold bg-brand-light border border-slate-200 text-slate-500 rounded-full px-2.5 py-1">
                  <Users className="w-3 h-3" />
                  {day.people.length}{groupSize ? ` de ${groupSize}` : ''}
                </span>
              </h3>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {day.people.map((p, i) => (
                  <li key={`${p.recordId}-${i}`} className="flex items-center gap-2 text-sm text-brand-grey min-w-0">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className={clsx(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                      p.tipo === 'socio' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700',
                    )}>
                      {p.tipo === 'socio' ? 'Socio' : 'No socio'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4 text-center shadow-sm">
    <div className="text-2xl md:text-3xl font-black text-brand-blue tabular-nums">{value}</div>
    <div className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{label}</div>
  </div>
);
