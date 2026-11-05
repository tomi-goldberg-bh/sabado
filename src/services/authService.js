import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  collection, doc, getDoc, setDoc, onSnapshot, terminate, clearIndexedDbPersistence,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import { isAdminEmail } from '../config/admins';

// usuarios/{uid} -> { email, role: 'grupo', group }  (los admins se definen por mail en config/admins.js)
const usuariosCol = collection(db, 'usuarios');

const ERRORS = {
  'auth/invalid-credential': 'Mail o contraseña incorrectos.',
  'auth/invalid-email': 'El mail no es válido.',
  'auth/user-disabled': 'Este usuario está deshabilitado.',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.',
  'auth/network-request-failed': 'Sin conexión a internet.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese mail.',
  'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
  'auth/missing-password': 'Falta la contraseña.',
};
export const authErrorMessage = (err) => ERRORS[err?.code] || 'Ocurrió un error. Probá de nuevo.';

async function loadProfile(user) {
  if (isAdminEmail(user.email)) return { uid: user.uid, email: user.email, role: 'admin' };
  try {
    const snap = await getDoc(doc(usuariosCol, user.uid));
    const data = snap.exists() ? snap.data() : null;
    if (data?.role === 'grupo' && data.group) {
      return { uid: user.uid, email: user.email, role: 'grupo', group: data.group };
    }
  } catch {
    // sin permiso o sin conexión
  }
  return { uid: user.uid, email: user.email, role: 'sin_acceso' };
}

export const authService = {
  // callback(profile | null). profile.role: 'admin' | 'grupo' | 'sin_acceso'
  subscribe(callback) {
    return onAuthStateChanged(auth, async (user) => {
      callback(user ? await loadProfile(user) : null);
    });
  },

  login(email, password) {
    return signInWithEmailAndPassword(auth, email.trim(), password);
  },

  sendReset(email) {
    return sendPasswordResetEmail(auth, email.trim());
  },

  // Cierra sesión y borra los datos guardados en el dispositivo, para que el
  // próximo usuario que entre en este equipo no vea datos de otro.
  async logout() {
    await signOut(auth);
    try {
      await terminate(db);
      await clearIndexedDbPersistence(db);
    } catch {
      // si no se puede limpiar, igual se recarga
    }
    window.location.reload();
  },

  // --- Administración de usuarios de grupo (solo admins) ---

  subscribeUsers(callback, onError) {
    return onSnapshot(usuariosCol, (snap) => {
      callback(snap.docs.map(d => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => (a.group || '').localeCompare(b.group || '', 'es') || a.email.localeCompare(b.email)));
    }, onError);
  },

  // Crea la cuenta con una instancia aparte de Firebase, así el admin no pierde su sesión.
  async createGroupUser({ email, password, group }, createdBy) {
    const secondary = initializeApp(firebaseConfig, `alta-${Date.now()}`);
    try {
      const secAuth = getAuth(secondary);
      const cred = await createUserWithEmailAndPassword(secAuth, email.trim(), password);
      await signOut(secAuth);
      await setDoc(doc(usuariosCol, cred.user.uid), {
        email: cred.user.email, role: 'grupo', group, createdAt: Date.now(), createdBy,
      });
      return cred.user.uid;
    } finally {
      await deleteApp(secondary);
    }
  },

  changeGroup(uid, group) {
    return setDoc(doc(usuariosCol, uid), { group }, { merge: true });
  },

  // Quita o devuelve el acceso. La cuenta sigue existiendo, así se puede reactivar.
  setActive(uid, active) {
    return setDoc(doc(usuariosCol, uid), { role: active ? 'grupo' : 'baja' }, { merge: true });
  },
};
