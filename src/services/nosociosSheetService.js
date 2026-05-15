const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1kNmeS3NrhOPRyv58S7bs8L3_3Rat6Gl75bnKsLwmB7U/export?format=csv';
const CACHE_KEY = 'sabado_nosocios_sheet_cache';

function parseCSV(text) {
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;
    const grupo = (parts[0] || '').trim();
    const nombre = (parts[1] || '').trim();
    const apellido = (parts[2] || '').trim();
    const fullName = `${nombre} ${apellido}`.replace(/\s+/g, ' ').trim();
    if (fullName) {
      rows.push({ name: fullName, grupo, nombre, apellido });
    }
  }
  return rows;
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // storage full
  }
}

export const nosociosSheetService = {
  async fetchSocios() {
    const cache = loadCache();

    try {
      const response = await fetch(SHEET_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const socios = parseCSV(text);
      if (socios.length > 0) {
        saveCache(socios);
      }
      return socios;
    } catch {
      return cache || [];
    }
  },

  getCachedSocios() {
    return loadCache() || [];
  },
};
