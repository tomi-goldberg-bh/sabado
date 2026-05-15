import * as XLSX from 'xlsx';

const STORAGE_KEY = 'sabado_archivo_unificado';

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

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage limit
  }
}

export const archivoService = {
  TIPO_SOCIO: 'socio',
  TIPO_NO_SOCIO: 'no_socio',

  getTodayKey,

  saveRecord(record) {
    const today = getTodayKey();
    const all = loadAll();
    if (!all[today]) all[today] = [];
    all[today].push(record);
    saveAll(all);
    return all;
  },

  getRecordsByDate(dateKey) {
    const all = loadAll();
    return all[dateKey] || [];
  },

  getTodayRecords() {
    return this.getRecordsByDate(getTodayKey());
  },

  getAllRecords() {
    return loadAll();
  },

  getAvailableDates() {
    return Object.keys(loadAll()).sort((a, b) => {
      return parseDateKey(b) - parseDateKey(a);
    });
  },

  deleteRecord(id) {
    const all = loadAll();
    for (const date of Object.keys(all)) {
      all[date] = all[date].filter(r => r.id !== id);
      if (all[date].length === 0) delete all[date];
    }
    saveAll(all);
    return all;
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

  downloadTodayReport() {
    const today = getTodayKey();
    const all = loadAll();
    const records = all[today] || [];
    if (records.length === 0) return false;
    this.exportToXLSX(records, `reporte-diario-${today}.xlsx`);
    return true;
  },
};
