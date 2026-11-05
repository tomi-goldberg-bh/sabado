// Grupos de la tnuá. Se usan en No socios, Presentismo y en los usuarios de grupo.
export const GROUPS = [
  'Shaiajut', 'Metailim', 'Zoharim', 'Mekorim', 'Otzar', 'Akebot',
  'Iedidim', 'Shebibim', 'Balagan', 'Mejubar', 'Neshama', 'Alufim',
  'Jazak', 'Anakim',
];

export const SIN_GRUPO = 'Sin grupo';

function normalizeGroup(g) {
  return (g || '').trim().toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
}

// Convierte el texto de grupo de una planilla en uno de GROUPS (o null).
export function matchGroup(sheetGroup) {
  const norm = normalizeGroup(sheetGroup);
  if (!norm) return null;
  for (const g of GROUPS) {
    if (g.toLowerCase() === norm) return g;
  }
  return GROUPS.find(g => g.toLowerCase().includes(norm) || norm.includes(g.toLowerCase())) || null;
}
