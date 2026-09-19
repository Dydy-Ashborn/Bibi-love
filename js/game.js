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
export function drawQuestions({ spice, durationMin, exclude = [], poolFilter = null }) {
  const { total } = questionCount(durationMin);
  const banned = new Set(exclude);
  const base = () => (poolFilter ? poolFilter(poolForSpice(spice)) : poolForSpice(spice));
  let pool = base().filter(q => !banned.has(q.i));
  if (pool.length < total) pool = base();   // rideau : on recycle

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
export function buildPlan(questionIds, perRound, opts = {}) {
  const perso = Math.max(0, Number(opts.perso) || 0);
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

  // Questions personnalisées : elles remplacent les DERNIÈRES questions des manches 1
  // et 2, dont la source est justement fixe (A puis B). On en laisse toujours au moins
  // une standard par manche — une manche entièrement perso perdrait le rythme du jeu,
  // et surtout le `qid` d'origine reste dans le step : il sert de repli pour un couple
  // dont l'auteur n'a pas écrit assez de questions.
  if (perso > 0) {
    const k = Math.min(perso, Math.max(0, perRound - 1));
    for (let r = 1; r <= 2; r++) {
      const slot = r === 1 ? 'A' : 'B';
      const round = plan.rounds[r - 1];
      for (let n = 0; n < k; n++) {
        const pos = round.length - k + n;
        if (pos < 0 || !round[pos]) continue;
        round[pos] = Object.assign({}, round[pos], { custom: true, slot, n });
      }
    }
  }
  return plan;
}

/** Nombre de questions perso réellement utilisables par auteur, pour une durée donnée. */
export function persoUtilisables(perRound, ecrites) {
  return Math.min(Math.max(0, ecrites), Math.max(0, perRound - 1));
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
export function optionsFor(q, names = {}, sourceGender) {
  if (q.k === 'who') {
    return [
      { token: 'A',    label: names.nameA || 'Joueur A' },
      { token: 'B',    label: names.nameB || 'Joueur B' },
      { token: 'BOTH', label: 'Les deux' },
      { token: 'NONE', label: "Ni l'un ni l'autre" }
    ];
  }
  // Une option décrit toujours la réponse du RÉPONDANT, dans les deux sens de lecture :
  // elle s'accorde donc à son genre, jamais à celui de qui devine.
  return q.o.map((label, idx) => ({ token: String(idx), label: accordSuffixes(label, sourceGender) }));
}

const VOYELLE = /^[aàâeéèêëiîïoôuùûyhAÀÂEÉÈÊËIÎÏOÔUÙÛYH]/;

/**
 * Accorde les pronoms et possessifs d'un texte selon un genre.
 * `g` vaut 'f' (féminin), 'h' (masculin) ou 'n' (non précisé).
 * En 'n' on ne touche à rien : les formes doubles « il/elle », « ton/ta »,
 * « gêné(e) » restent affichées telles quelles, ce qui reste lisible et inclusif.
 */
export function accordPronoms(text, g) {
  if (!text || (g !== 'f' && g !== 'h')) return text;
  const f = g === 'f';
  return text
    .replace(/\bIl\/elle\b/g,   f ? 'Elle' : 'Il')
    .replace(/\bil\/elle\b/g,   f ? 'elle' : 'il')
    .replace(/\bLui\/elle\b/g,  f ? 'Elle' : 'Lui')
    .replace(/\blui\/elle\b/g,  f ? 'elle' : 'lui')
    .replace(/\bTon\/ta\b/g,    f ? 'Ta'   : 'Ton')
    .replace(/\bton\/ta\b/g,    f ? 'ta'   : 'ton')
    .replace(/\bLe\/la\b/g,     f ? 'La'   : 'Le')
    .replace(/\ble\/la\b/g,     f ? 'la'   : 'le')
    .replace(/\bSon\/sa\b/g,    f ? 'Sa'   : 'Son')
    .replace(/\bson\/sa\b/g,    f ? 'sa'   : 'son');
}

/**
 * Accorde les terminaisons entre parenthèses : « gêné(e) », « furieux(se) »,
 * « premier(e) », « conducteur(trice) », « sportif(ve) », « quel(le) ».
 * L'ordre des règles compte : les cas qui suppriment une lettre (x → se, f → ve)
 * doivent passer AVANT la règle générique « (e) », sinon « furieux(se) » devient
 * « furieuxse ».
 */
export function accordSuffixes(text, g) {
  if (!text || (g !== 'f' && g !== 'h')) return text;
  const f = g === 'f';
  return text
    .replace(/([A-Za-zÀ-ÿ]+?)teur\(trice\)/g, (m, r) => f ? r + 'trice' : r + 'teur')
    .replace(/([A-Za-zÀ-ÿ]+?)eur\(se\)/g,     (m, r) => f ? r + 'euse'  : r + 'eur')
    .replace(/([A-Za-zÀ-ÿ]+?)x\(se\)/g,       (m, r) => f ? r + 'se'    : r + 'x')
    .replace(/([A-Za-zÀ-ÿ]+?)f\(ve\)/g,       (m, r) => f ? r + 've'    : r + 'f')
    .replace(/([A-Za-zÀ-ÿ]+?)ier\(e\)/g,      (m, r) => f ? r + 'ière'  : r + 'ier')
    .replace(/([A-Za-zÀ-ÿ]+?)er\(e\)/g,        (m, r) => f ? r + 'ère'   : r + 'er')
    .replace(/\(le\)/g,  f ? 'le' : '')
    .replace(/\(ne\)/g,  f ? 'ne' : '')
    .replace(/\(e\)/g,   f ? 'e'  : '');
}

/**
 * Énoncé posé au joueur qui répond sur lui-même.
 * Deux genres interviennent : les terminaisons parlent de LUI, les pronoms et
 * « ton/ta partenaire » parlent de l'AUTRE. Les mélanger est la source d'erreur
 * évidente ici — d'où deux paramètres distincts.
 */
export function selfPrompt(q, selfGender, partnerGender) {
  return accordPronoms(accordSuffixes(q.q, selfGender), partnerGender);
}

/**
 * Énoncé posé au conjoint qui devine. Tout parle du répondant ({p}), donc un seul genre.
 * Gère l'élision : « la réponse de Ash » se lit mal, on écrit « d'Ash ». Le h est traité
 * comme une voyelle — un h aspiré en prénom est plus rare qu'un h muet.
 */
export function guessPrompt(q, partnerName, sourceGender) {
  const p = partnerName || 'ton/ta conjoint(e)';
  let phrase = q.k === 'who' ? q.q : (q.g || q.q).replace(/\{p\}/g, p);
  phrase = accordPronoms(accordSuffixes(phrase, sourceGender), sourceGender);
  if (VOYELLE.test(p)) {
    phrase = phrase
      .replace(new RegExp('\\bde ' + p + '\\b', 'g'), "d'" + p)
      .replace(new RegExp('\\bque ' + p + '\\b', 'g'), "qu'" + p)
      .replace(new RegExp('\\bDe ' + p + '\\b', 'g'), "D'" + p);
  }
  return phrase;
}

export function isCorrect(guessToken, sourceToken) {
  return guessToken != null && sourceToken != null && guessToken === sourceToken;
}

/** Rang de complicité (mode Duo). `icon` = nom Font Awesome du sous-ensemble vendorisé. */
export function rankFor(ratio) {
  if (ratio >= 0.9) return { title: 'Âmes sœurs',    icon: 'heart-circle-check',  line: "Vous êtes la même personne dans deux corps. C'est presque inquiétant." };
  if (ratio >= 0.7) return { title: 'Complices',     icon: 'fire-flame-curved',   line: 'Vous vous connaissez par cœur, à deux ou trois détails près.' };
  if (ratio >= 0.5) return { title: 'Bien assortis', icon: 'heart',               line: "Solide. Il reste juste quelques zones d'ombre à explorer." };
  if (ratio >= 0.3) return { title: 'En rodage',     icon: 'hand-holding-heart',  line: 'Ça vient. Prévoyez une deuxième partie, et une longue discussion.' };
  return                   { title: 'Colocataires',  icon: 'face-meh',            line: "Vous partagez un appartement. L'amour, on va dire que ça se travaille." };
}

export { byId, QUESTIONS };
