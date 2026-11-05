import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { matchGroup, SIN_GRUPO } from '../config/groups';

// asistencias/{recordId}_{n} -> una persona que vino un día: { recordId, date, ts, group, name, tipo }
export const asistenciasCol = collection(db, 'asistencias');

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

function buildIndex(rows) {
  const idx = new Map();
  (rows || []).forEach(r => {
    const g = matchGroup(r.grupo);
    if (g && !idx.has(norm(r.name))) idx.set(norm(r.name), g);
  });
  return idx;
}

// Decide a qué grupo pertenece cada persona de un registro, usando las planillas
// (socios y juventud). Si no aparece en ninguna y el registro tiene un solo grupo
// elegido, se usa ese; si no, queda "Sin grupo".
export function resolveAttendees(record, { socios = [], juventud = [] } = {}) {
  const juvIdx = buildIndex(juventud);
  const socIdx = buildIndex(socios);
  const names = record.names?.length ? record.names : [record.name];
  const chosen = (record.groups || []).map(matchGroup).filter(Boolean);
  const fallback = chosen.length === 1 ? chosen[0] : SIN_GRUPO;

  return names.filter(Boolean).map((name, i) => {
    const fromSheet = record.tipo === 'socio'
      ? (socIdx.get(norm(name)) || juvIdx.get(norm(name)))
      : (juvIdx.get(norm(name)) || socIdx.get(norm(name)));
    // Si el nombre vino de la planilla con su grupo ya resuelto, respetarlo.
    const given = matchGroup(record.nameGroups?.[i]);
    return { name, group: given || fromSheet || fallback };
  });
}

const parseDateKey = (key) => {
  const [d, m, y] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const presentismoService = {
  // Escucha en vivo la asistencia de un grupo. callback recibe [{ date, people: [{name, tipo}] }], del día más reciente al más viejo.
  subscribeGroup(group, callback, onError) {
    const q = query(asistenciasCol, where('group', '==', group));
    return onSnapshot(q, (snap) => {
      const byDate = new Map();
      snap.docs.forEach(d => {
        const a = d.data();
        if (!byDate.has(a.date)) byDate.set(a.date, []);
        byDate.get(a.date).push(a);
      });
      const days = [...byDate.entries()]
        .map(([date, people]) => {
          // Si alguien quedó registrado dos veces el mismo día, se cuenta una sola.
          const unique = [...new Map(people.map(p => [norm(p.name), p])).values()];
          return { date, people: unique.sort((x, y) => x.name.localeCompare(y.name, 'es')) };
        })
        .sort((a, b) => parseDateKey(b.date) - parseDateKey(a.date));
      callback(days);
    }, (err) => onError?.(err));
  },
};
