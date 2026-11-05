import * as XLSX from 'xlsx';
import {
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, where, increment, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { googleSyncService } from './googleSyncService';

// Registros compartidos entre todos los dispositivos (Firestore).
//   records/{id}  -> un registro (socio o no socio), con su fecha "DD-MM-YYYY"
//   days/{fecha}  -> índice de días con registros, para el archivo
const recordsCol = collection(db, 'records');
const daysCol = collection(db, 'days');

const LEGACY_KEY = 'sabado_archivo_unificado';
const MIGRATED_KEY = 'sabado_archivo_migrado_firestore';

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

  async saveRecord(record) {
    const date = getTodayKey();
    const id = String(record.id || newId());
    const full = { ...record, id, date, ts: Date.now() };

    // No se espera la respuesta del servidor: con la caché local el registro
    // aparece al instante y se sube cuando haya conexión.
    setDoc(doc(recordsCol, id), full);
    setDoc(doc(daysCol, date), { date, ts: parseDateKey(date).getTime(), count: increment(1) }, { merge: true });

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
    deleteDoc(doc(recordsCol, String(record.id)));
    if (record.date) {
      setDoc(doc(daysCol, record.date), { count: increment(-1) }, { merge: true });
    }
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
  async migrateLocalRecords() {
    try {
      if (localStorage.getItem(MIGRATED_KEY)) return;
      const raw = localStorage.getItem(LEGACY_KEY);
      const all = raw ? JSON.parse(raw) : {};
      const entries = Object.entries(all).flatMap(([date, recs]) =>
        (recs || []).map(r => ({ ...r, id: String(r.id || newId()), date, ts: r.ts || parseDateKey(date).getTime() }))
      );
      // Lotes de hasta 400 escrituras (el máximo de Firestore es 500).
      for (let i = 0; i < entries.length; i += 400) {
        const batch = writeBatch(db);
        entries.slice(i, i + 400).forEach(r => batch.set(doc(recordsCol, r.id), r, { merge: true }));
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
