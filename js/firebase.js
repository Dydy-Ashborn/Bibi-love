/* Initialisation Firebase + auth anonyme.
 * Un seul point d'entrée : `ready()` résout quand l'utilisateur anonyme existe. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { firebaseConfig } from './config.js';

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

enableIndexedDbPersistence(db).catch(() => { /* multi-onglets : ignoré */ });

let resolveReady;
const readyPromise = new Promise(r => { resolveReady = r; });

onAuthStateChanged(auth, user => { if (user) resolveReady(user); });
signInAnonymously(auth).catch(err => {
  console.error('[bibi] auth anonyme refusée', err);
  document.body.dataset.authError = '1';
});

/** @returns {Promise<import('firebase/auth').User>} */
export function ready() { return readyPromise; }
export function uid() { return auth.currentUser ? auth.currentUser.uid : null; }
