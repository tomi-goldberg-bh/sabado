import * as XLSX from 'xlsx';
import {
  collection, doc, setDoc, getDocs, onSnapshot, query, where, increment, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { googleSyncService } from './googleSyncService';
import { asistenciasCol, resolveAttendees } from './presentismoService';

// Registros compartidos entre todos los dispositivos (Firestore).
//   records/{id}  -> un registro (socio o no socio), con su fecha "DD-MM-YYYY"
//   days/{fecha}  -> índice de días con registros, para el archivo
const recordsCol = collection(db, 'records');
const daysCol = collection(db, 'days');

const LEGACY_KEY = 'sabado_archivo_unificado';
const MIGRATED_KEY = 'sabado_archivo_migrado_firestore';
const BACKFILL_KEY = 'sabado_asistencias_completadas_v1';

function getTodayKey() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseDateKey(key) {
  const [d, m, y] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function addAttendance(batch, record) {
  (record.attendees || []).forEach((a, i) => {
    batch.set(doc(asistenciasCol, `${record.id}_${i}`), {
      recordId: record.id, date: record.date, ts: record.ts || 0, tipo: record.tipo, name: a.name, group: a.group,
    });
  });
}

const byNewest = (a, b) => (b.ts || 0) - (a.ts || 0);

// Estado de sincronización, para el indicador de la barra lateral.
let status = { online: typeof navigator === 'undefined' ? true : navigator.onLine, synced: false };
const statusListeners = new Set();
function setStatus(patch) {
  status = { ...status, ...patch };
  statusListeners.forEach(cb => { try { cb(status); } catch { /* ignore */ } });
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setStatus({ online: true }));
  window.addEventListener('offline', () => setStatus({ online: false, synced: false }));
}

export const archivoService = {
  TIPO_SOCIO: 'socio',
  TIPO_NO_SOCIO: 'no_socio',

  getTodayKey,

  // sheets: { socios, juventud } (filas de las planillas) para saber el grupo de cada persona.
  async saveRecord(record, sheets) {
    const date = getTodayKey();
    const id = String(record.id || newId());
    const ts = Date.now();
    const attendees = resolveAttendees(record, sheets);
    const full = { ...record, id, date, ts, attendees };

    // No se espera la respuesta del servidor: con la caché local el registro
    // aparece al instante y se sube cuando haya conexión.
    const batch = writeBatch(db);
    batch.set(doc(recordsCol, id), full);
    batch.set(doc(daysCol, date), { date, ts: parseDateKey(date).getTime(), count: increment(1) }, { merge: true });
    addAttendance(batch, full);
    batch.commit().catch(err => console.error('No se pudo guardar el registro:', err));

    googleSyncService.enqueueRecord({
      ...full,
      nombre: full.name || '',
      metodoPago: full.payment || 'N/A',
      hora: full.time || '',
      grupo: (full.groups || []).join(', '),
      dia: date,
      monto: full.amount || 0,
    });

    return full;
  },

  deleteRecord(record) {
    const batch = writeBatch(db);
    batch.delete(doc(recordsCol, String(record.id)));
    if (record.date) {
      batch.set(doc(daysCol, record.date), { count: increment(-1) }, { merge: true });
    }
    (record.attendees || []).forEach((_, i) => batch.delete(doc(asistenciasCol, `${record.id}_${i}`)));
    batch.commit().catch(err => console.error('No se pudo borrar el registro:', err));
  },

  // Escucha en tiempo real los registros de un día. Devuelve la función para dejar de escuchar.
  subscribeDay(dateKey, callback) {
    const q = query(recordsCol, where('date', '==', dateKey));
    return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      callback(snap.docs.map(d => d.data()).sort(byNewest));
      setStatus({ synced: !snap.metadata.fromCache && !snap.metadata.hasPendingWrites });
    }, () => setStatus({ synced: false }));
  },

  subscribeStatus(callback) {
    statusListeners.add(callback);
    callback(status);
    return () => statusListeners.delete(callback);
  },

  async getAvailableDays() {
    const snap = await getDocs(daysCol);
    return snap.docs
      .map(d => d.data())
      .filter(d => (d.count || 0) > 0)
      .sort((a, b) => parseDateKey(b.date) - parseDateKey(a.date));
  },

  async getRecordsByDate(dateKey) {
    const snap = await getDocs(query(recordsCol, where('date', '==', dateKey)));
    return snap.docs.map(d => d.data()).sort(byNewest);
  },

  // Sube una sola vez los registros que este dispositivo tenía guardados solo en su navegador.
  async migrateLocalRecords(sheets) {
    try {
      if (localStorage.getItem(MIGRATED_KEY)) return;
      const raw = localStorage.getItem(LEGACY_KEY);
      const all = raw ? JSON.parse(raw) : {};
      const entries = Object.entries(all).flatMap(([date, recs]) =>
        (recs || []).map(r => {
          const rec = { ...r, id: String(r.id || newId()), date, ts: r.ts || parseDateKey(date).getTime() };
          return { ...rec, attendees: resolveAttendees(rec, sheets) };
        })
      );
      // Lotes chicos (Firestore admite hasta 500 escrituras por lote; cada registro usa varias).
      for (let i = 0; i < entries.length; i += 100) {
        const batch = writeBatch(db);
        entries.slice(i, i + 100).forEach(r => {
          batch.set(doc(recordsCol, r.id), r, { merge: true });
          addAttendance(batch, r);
        });
        await batch.commit();
      }
      // Recalcular los contadores de los días migrados a partir de lo que hay en la base.
      const dates = [...new Set(entries.map(r => r.date))];
      for (const date of dates) {
        const recs = await this.getRecordsByDate(date);
        await setDoc(doc(daysCol, date), { date, ts: parseDateKey(date).getTime(), count: recs.length }, { merge: true });
      }
      localStorage.setItem(MIGRATED_KEY, new Date().toISOString());
    } catch (err) {
      console.error('No se pudieron migrar los registros locales:', err);
    }
  },

  // Una sola vez por dispositivo: arma la asistencia de los registros que se guardaron
  // antes de que existiera Presentismo.
  async backfillAttendance(sheets) {
    try {
      if (localStorage.getItem(BACKFILL_KEY)) return;
      const snap = await getDocs(recordsCol);
      const pending = snap.docs.map(d => d.data()).filter(r => !Array.isArray(r.attendees));
      for (let i = 0; i < pending.length; i += 100) {
        const batch = writeBatch(db);
        pending.slice(i, i + 100).forEach(r => {
          const withAtt = { ...r, attendees: resolveAttendees(r, sheets) };
          batch.set(doc(recordsCol, r.id), { attendees: withAtt.attendees }, { merge: true });
          addAttendance(batch, withAtt);
        });
        await batch.commit();
      }
      localStorage.setItem(BACKFILL_KEY, new Date().toISOString());
    } catch (err) {
      console.error('No se pudo completar la asistencia de registros anteriores:', err);
    }
  },

  exportToXLSX(records, filename) {
    const data = records.map(r => [
      r.name,
      r.tipo === 'socio' ? 'Socio' : 'No Socio',
      (r.groups || []).join('; '),
      r.amount || 0,
      r.payment === 'efectivo' ? 'Efectivo' : r.payment === 'mercadopago' ? 'Mercado Pago' : '',
      r.time || '',
    ]);

    data.unshift(['Nombre', 'Categoría', 'Grupo(s)', 'Monto', 'Pago', 'Hora']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 30 },
      { wch: 10 },
      { wch: 25 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    XLSX.writeFile(wb, filename);
  },

  // Descarga el reporte del día con los registros de todos los dispositivos.
  async downloadTodayReport() {
    const today = getTodayKey();
    const records = await this.getRecordsByDate(today);
    if (records.length === 0) return false;
    this.exportToXLSX([...records].sort((a, b) => (a.ts || 0) - (b.ts || 0)), `reporte-diario-${today}.xlsx`);
    return true;
  },
};
