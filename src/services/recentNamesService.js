const STORAGE_KEY = 'sabado_nombres_recientes';
const MAX_NAMES = 50;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(names) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // storage full
  }
}

export const recentNamesService = {
  addName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const names = load();
    const idx = names.findIndex(n => n.name.toLowerCase() === trimmed.toLowerCase());
    if (idx !== -1) {
      const [existing] = names.splice(idx, 1);
      existing.lastUsed = Date.now();
      names.unshift(existing);
    } else {
      names.unshift({ name: trimmed, lastUsed: Date.now() });
      if (names.length > MAX_NAMES) names.pop();
    }
    save(names);
  },

  searchNames(query) {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return load()
      .filter(n => n.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map(n => n.name);
  },

  getRecent(limit = 10) {
    return load().slice(0, limit).map(n => n.name);
  },
};
