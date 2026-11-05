import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

// Configuración web de Firebase (Consola de Firebase > Configuración del proyecto > Tus apps).
// Estos valores no son secretos: identifican el proyecto y viajan igual en el código del sitio.
const firebaseConfig = {
  apiKey: 'AIzaSyDSNJVkhxPrRAdTBgZumPKFXq-Ujo3ySjw',
  authDomain: 'sabadoapp.firebaseapp.com',
  projectId: 'sabadoapp',
  storageBucket: 'sabadoapp.firebasestorage.app',
  messagingSenderId: '618383494537',
  appId: '1:618383494537:web:b9f401ff6a25ca0838e558',
};

const app = initializeApp(firebaseConfig);

// La caché persistente guarda los datos en el dispositivo: si se corta internet
// se puede seguir registrando y los cambios se suben solos al volver la conexión.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
