/* Bibi Love — couche d'accès Firestore. Aucun composant UI ici.
 * Modèle :
 *   games/{code}                     doc de partie (config + état live) — écrit par l'hôte seul
 *   games/{code}/players/{uid}       prénom, couple, slot, avancement — écrit par le joueur
 *   games/{code}/answers/{uid}       { [qid]: token } — lisible par son auteur et par l'hôte
 */
import {
  doc, collection, setDoc, updateDoc, getDoc, getDocs, onSnapshot,
  serverTimestamp, deleteDoc, query, where, limit
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { db, uid } from './firebase.js';
import { makeCode } from './util.js';
import { drawQuestions, questionCount } from './game.js';

const gameRef    = code => doc(db, 'games', code);
const playersRef = code => collection(db, 'games', code, 'players');
const playerRef  = (code, u) => doc(db, 'games', code, 'players', u);
const answersRef = (code, u) => doc(db, 'games', code, 'answers', u);

/* ── Mémoire locale de l'hôte ──────────────────────────────────────────── */
const LS_GAMES = 'bibi.host.games';
const LS_USED  = 'bibi.host.usedQuestions';

export function hostGames() {
  try { return JSON.parse(localStorage.getItem(LS_GAMES) || '[]'); } catch { return []; }
}
function rememberGame(entry) {
  const list = hostGames().filter(g => g.code !== entry.code);
  list.unshift(entry);
  localStorage.setItem(LS_GAMES, JSON.stringify(list.slice(0, 12)));
}
export function forgetGame(code) {
  localStorage.setItem(LS_GAMES, JSON.stringify(hostGames().filter(g => g.code !== code)));
}
function usedQuestions() {
  try { return JSON.parse(localStorage.getItem(LS_USED) || '[]'); } catch { return []; }
}
function markUsed(ids) {
  const all = Array.from(new Set([...usedQuestions(), ...ids]));
  localStorage.setItem(LS_USED, JSON.stringify(all.slice(-400)));
}
export function resetUsedQuestions() { localStorage.removeItem(LS_USED); }

/* ── Création / lecture ────────────────────────────────────────────────── */

/** @param {{mode:string,spice:number,pairing:string,durationMin:number,couples:{name:string}[]}} cfg */
export async function createGame(cfg) {
  const { perRound } = questionCount(cfg.durationMin);
  let code = makeCode();
  for (let tries = 0; tries < 5; tries++) {
    const snap = await getDoc(gameRef(code));
    if (!snap.exists()) break;
    code = makeCode();
  }
  const questionIds = drawQuestions({
    spice: cfg.spice, durationMin: cfg.durationMin, exclude: usedQuestions()
  });
  markUsed(questionIds);

  const couples = cfg.couples.map((c, k) => ({
    id: 'c' + (k + 1), name: c.name || 'Couple ' + (k + 1),
    score: 0, nameA: '', nameB: ''
  }));

  const data = {
    code, hostUid: uid(), createdAt: serverTimestamp(),
    status: 'lobby',
    mode: cfg.mode, spice: cfg.spice, pairing: cfg.pairing,
    durationMin: cfg.durationMin, perRound,
    couples, questionIds,
    live: { round: 1, qIdx: 0, coupleIdx: 0, phase: 'idle', guess: null },
    finalistId: null, finalResult: null
  };
  await setDoc(gameRef(code), data);
  rememberGame({ code, createdAt: Date.now(), mode: cfg.mode, spice: cfg.spice,
                 couples: couples.map(c => c.name) });
  return data;
}

export async function loadGame(code) {
  const snap = await getDoc(gameRef(code));
  return snap.exists() ? snap.data() : null;
}

export function watchGame(code, cb) {
  return onSnapshot(gameRef(code), s => cb(s.exists() ? s.data() : null));
}

export function watchPlayers(code, cb) {
  return onSnapshot(playersRef(code), s => cb(s.docs.map(d => ({ uid: d.id, ...d.data() }))));
}

export async function patchGame(code, patch) {
  await updateDoc(gameRef(code), patch);
}

export async function deleteGame(code) {
  const ps = await getDocs(playersRef(code));
  await Promise.all(ps.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(gameRef(code));
  forgetGame(code);
}

/* ── Côté joueur ───────────────────────────────────────────────────────── */

export async function joinGame(code, { name, coupleId, slot }) {
  await setDoc(playerRef(code, uid()), {
    name, coupleId, slot, done: false, answered: 0, joinedAt: serverTimestamp()
  }, { merge: true });
  return uid();
}

export async function myPlayer(code) {
  const s = await getDoc(playerRef(code, uid()));
  return s.exists() ? { uid: uid(), ...s.data() } : null;
}

export async function saveAnswer(code, qid, token, answeredCount, total) {
  await setDoc(answersRef(code, uid()), { [qid]: token }, { merge: true });
  await setDoc(playerRef(code, uid()),
    { answered: answeredCount, done: answeredCount >= total }, { merge: true });
}

export async function myAnswers(code) {
  const s = await getDoc(answersRef(code, uid()));
  return s.exists() ? s.data() : {};
}

/** Réservé à l'hôte (les règles Firestore refusent la lecture aux joueurs). */
export async function allAnswers(code, players) {
  const out = {};
  await Promise.all(players.map(async p => {
    const s = await getDoc(answersRef(code, p.uid));
    out[p.uid] = s.exists() ? s.data() : {};
  }));
  return out;
}

export { uid };
