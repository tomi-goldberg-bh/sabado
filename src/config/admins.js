// Mails de los administradores: pueden usar toda la app.
// Si cambia esta lista, hay que cambiarla también en firestore.rules (función isAdmin).
export const ADMIN_EMAILS = [
  'juventud@bethilel.org.ar',
].map(e => e.toLowerCase());

export const isAdminEmail = (email) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());
