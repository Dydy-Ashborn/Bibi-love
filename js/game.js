/* Bibi Love — logique de partie (pure, sans Firestore ni DOM).
 * Sert à la fois à l'écran hôte et à l'écran joueur. */
import { QUESTIONS, poolForSpice, byId } from './data/questions.js';
import { RULES } from './config.js';
import { shuffle } from './util.js';

export const WHO_TOKENS = ['A', 'B', 'BOTH', 'NONE'];

/** Nombre total de questions à faire remplir en amont pour une durée donnée. */
export function questionCount(durationMin) {
  const n = RULES.QUESTIONS_PER_ROUND[durationMin] || 4;
  return { perRound: n, total: n * 3 + RULES.FINAL_QUESTIONS };
}

/**
 * Tire la liste de questions d'une partie.
 * Équilibre les thèmes, alterne les types, exclut les questions déjà jouées.
 * @param {{spice:number, durationMin:number, exclude?:string[]}} opts
 */
export function drawQuestions({ spice, durationMin, exclude = [] }) {
  const { total } = questionCount(durationMin);
  const banned = new Set(exclude);
  let pool = poolForSpice(spice).filter(q => !banned.has(q.i));
  if (pool.length < total) pool = poolForSpice(spice);   // rideau : on recycle

  // Priorise les questions du niveau choisi pour que le curseur se sente.
  const top  = shuffle(pool.filter(q => q.s === spice));
  const rest = shuffle(pool.filter(q => q.s !== spice));
  const ordered = [...top, ...rest];

  // Alterne self / who pour le rythme.
  const selfs = ordered.filter(q => q.k === 'self');
  const whos  = ordered.filter(q => q.k === 'who');
  const out = [];
  while (out.length < total && (selfs.length || whos.length)) {
    const wantWho = out.length % 3 === 2;             // 1 "qui de vous deux" toutes les 3
    const src = (wantWho ? whos : selfs).length ? (wantWho ? whos : selfs)
                                                : (selfs.length ? selfs : whos);
    out.push(src.shift().i);
  }
  return out.slice(0, total);
}

/**
 * Plan de la partie : à quelle manche / question correspond chaque index.
 * Manche 1 : le slot A a répondu, B devine.
 * Manche 2 : le slot B a répondu, A devine.
 * Manche 3 : manche bonus, la source alterne A/B.
 * Finale   : 7 questions, source = slot A, devineur = slot B.
 */
export function buildPlan(questionIds, perRound) {
  const plan = { rounds: [], final: [] };
  for (let r = 1; r <= 3; r++) {
    const slice = questionIds.slice((r - 1) * perRound, r * perRound);
    plan.rounds.push(slice.map((qid, k) => ({
      qid,
      source: r === 1 ? 'A' : r === 2 ? 'B' : (k % 2 === 0 ? 'A' : 'B'),
      points: r === 3 ? RULES.POINTS_BONUS : RULES.POINTS_ROUND_1_2
    })));
  }
  plan.final = questionIds.slice(perRound * 3, perRound * 3 + RULES.FINAL_QUESTIONS)
    .map(qid => ({ qid, source: 'A' }));
  return plan;
}

export const ROUND_TITLES = {
  1: 'Manche 1',
  2: 'Manche 2',
  3: 'Manche bonus',
  final: 'La Finale'
};

/** Libellé de manche adapté au réglage mixte / libre. */
export function roundSubtitle(round, pairing, couple) {
  const A = couple ? (couple.nameA || 'Joueur A') : 'Joueur A';
  const B = couple ? (couple.nameB || 'Joueur B') : 'Joueur B';
  if (round === 3) return 'Double ou rien : ' + RULES.POINTS_BONUS + ' points la question';
  if (round === 'final') return RULES.FINAL_QUESTIONS + ' questions en ' + RULES.FINAL_SECONDS + ' secondes';
  if (pairing === 'mixte') {
    return round === 1 ? 'Les femmes devinent les réponses de leur conjoint'
                       : 'Les hommes devinent les réponses de leur conjointe';
  }
  return round === 1 ? `${B} devine les réponses de ${A}`
                     : `${A} devine les réponses de ${B}`;
}

/**
 * Options affichables d'une question.
 * @param {object} q question brute
 * @param {{nameA:string,nameB:string}} names prénoms du couple concerné
 * @returns {{token:string,label:string}[]}
 */
export function optionsFor(q, names = {}) {
  if (q.k === 'who') {
    return [
      { token: 'A',    label: names.nameA || 'Joueur A' },
      { token: 'B',    label: names.nameB || 'Joueur B' },
      { token: 'BOTH', label: 'Les deux' },
      { token: 'NONE', label: "Ni l'un ni l'autre" }
    ];
  }
  return q.o.map((label, idx) => ({ token: String(idx), label }));
}

/** Énoncé posé au joueur qui répond sur lui-même. */
export function selfPrompt(q) { return q.q; }

/** Énoncé posé au conjoint qui devine. */
export function guessPrompt(q, partnerName) {
  const p = partnerName || 'ton/ta conjoint(e)';
  if (q.k === 'who') return q.q;
  return (q.g || q.q).replace(/\{p\}/g, p);
}

export function isCorrect(guessToken, sourceToken) {
  return guessToken != null && sourceToken != null && guessToken === sourceToken;
}

/** Rang de complicité (mode Duo). */
export function rankFor(ratio) {
  if (ratio >= 0.9) return { title: 'Âmes sœurs',   line: "Vous êtes la même personne dans deux corps. C'est presque inquiétant.", emoji: '💞' };
  if (ratio >= 0.7) return { title: 'Complices',    line: 'Vous vous connaissez par cœur, à deux ou trois détails près.',          emoji: '❤️‍🔥' };
  if (ratio >= 0.5) return { title: 'Bien assortis',line: 'Solide. Il reste juste quelques zones d\'ombre à explorer.',            emoji: '💘' };
  if (ratio >= 0.3) return { title: 'En rodage',    line: 'Ça vient. Prévoyez une deuxième partie, et une longue discussion.',      emoji: '💛' };
  return                   { title: 'Colocataires', line: 'Vous partagez un appartement. L\'amour, on va dire que ça se travaille.', emoji: '🫠' };
}

export { byId, QUESTIONS };
