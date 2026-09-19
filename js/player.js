/* Bibi Love — parcours joueur : rejoindre puis répondre en amont.
 * Le joueur ne voit jamais les réponses de son conjoint (règles Firestore). */
import { $, $$, el, icon, iconHtml, showScreen, toast, sfx, burst, shake, showConfirmModal } from './util.js';
import { byId, optionsFor, selfPrompt } from './game.js';
import { PHASE, estMonTour } from './live.js';
import { pioche, REACT_GOOD, REACT_BAD, RECAP_JOUEUR, ATTENTE } from './data/verdicts.js';
import { THEMES, SPICE, estTonPerso } from './data/questions.js';
import { loadGame, joinGame, myPlayer, myAnswers, saveAnswer,
         watchPlayers, watchGame, sendGuess, saveCustom, myCustom, uid } from './store.js';
import { tirerIdees } from './data/idees.js';

import { RULES } from './config.js';

const state = {
  code: null, game: null, players: [], me: null,
  answers: {}, custom: [], idx: 0, unsub: null, unsubGame: null,
  gender: null, lastSeq: -1, sent: -1
};

const LS_NAME = 'bibi.player.name';

export async function enterJoin(code) {
  state.code = code;
  const game = await loadGame(code);
  if (!game) { toast("Ce code ne correspond à aucune partie.", 'err'); location.hash = '#/'; return; }
  state.game = game;

  leavePlayer();
  state.unsub = watchPlayers(code, list => { state.players = list; renderJoin(); refreshQuizOptions(); });
  state.unsubGame = watchGame(code, g => { if (g) { state.game = g; onGameUpdate(g); } });

  state.me = await myPlayer(code);
  state.answers = await myAnswers(code);
  state.custom = state.me ? await myCustom(code) : [];

  if (state.me) { openQuizOrDone(); return; }
  renderJoin();
  showScreen('screen-join');
}

/* ── Écran « rejoindre » ───────────────────────────────────────── */
function renderJoin() {
  const g = state.game;
  if (!g) return;
  const sp = SPICE[g.spice] || SPICE[1];
  const spiceLabel = `${iconHtml(sp.icon)} ${sp.label}`;
  const total = g.questionIds.length;
  $('#joinMeta').innerHTML = estTonPerso(g.spice)
    ? `Ambiance <strong>${spiceLabel}</strong> · aucun questionnaire à remplir.<br>` +
      `Tu écris toi-même les questions que ton/ta partenaire devra deviner, avec la réponse attendue.`
    : `Ambiance <strong>${spiceLabel}</strong> · ${total} questions · environ ${Math.ceil(total * 0.35)} minutes.<br>` +
      `Réponds <strong>pour toi</strong> : ton/ta partenaire devra deviner ce que tu as mis.` +
    (sp.adult
      ? `<span class="adult-note">${iconHtml('fire-flame-curved')}Questionnaire explicite réservé aux adultes. ` +
        `Si ce n'est pas ce à quoi tu t'attendais, ferme cette page et préviens l'organisateur.</span>`
      : '');

  const nameInput = $('#inputName');
  if (!nameInput.value) nameInput.value = localStorage.getItem(LS_NAME) || '';

  const box = $('#joinCouples');
  box.innerHTML = '';
  box.classList.toggle('choice-grid-3', g.couples.length > 2);
  g.couples.forEach(c => {
    const taken = state.players.filter(p => p.coupleId === c.id);
    const full = taken.length >= 2;
    const btn = el('button', {
      class: 'choice' + (state.pickedCouple === c.id ? ' is-on' : '') + (full ? ' is-dim' : ''),
      'data-value': c.id, disabled: full || null
    },
      el('span', { class: 'choice-label' }, c.name),
      el('span', { class: 'choice-hint' },
        full ? 'Complet' : taken.length ? `Avec ${taken[0].name}` : 'Personne encore')
    );
    btn.addEventListener('click', () => {
      state.pickedCouple = c.id;
      $$('.choice', box).forEach(b => b.classList.toggle('is-on', b === btn));
      sfx.tap();
    });
    box.append(btn);
  });
  if (!state.pickedCouple && g.couples.length === 1) state.pickedCouple = g.couples[0].id;
  if (state.pickedCouple) $$('.choice', box).forEach(b => b.classList.toggle('is-on', b.dataset.value === state.pickedCouple));
}

$('#joinGender')?.addEventListener('click', e => {
  const btn = e.target.closest('.choice');
  if (!btn) return;
  state.gender = btn.dataset.gender;
  $$('#joinGender .choice').forEach(b => b.classList.toggle('is-on', b === btn));
  sfx.tap();
});

$('#btnJoinConfirm')?.addEventListener('click', async () => {
  const name = $('#inputName').value.trim();
  if (name.length < 2) { toast('Il me faut ton prénom.', 'err'); return; }
  if (!state.gender) { toast('Choisis comment on parle de toi.', 'err'); return; }
  if (!state.pickedCouple) { toast('Choisis ton couple.', 'err'); return; }
  const taken = state.players.filter(p => p.coupleId === state.pickedCouple);
  if (taken.length >= 2) { toast('Ce couple est complet.', 'err'); return; }
  const slot = taken.length === 0 ? 'A' : (taken[0].slot === 'A' ? 'B' : 'A');

  localStorage.setItem(LS_NAME, name);
  await joinGame(state.code, { name, coupleId: state.pickedCouple, slot, gender: state.gender });
  state.me = await myPlayer(state.code);
  sfx.good(); burst('hearts', 24);
  openQuizOrDone();
});

/* ── Questionnaire ─────────────────────────────────────────────── */
/**
 * Après l'inscription on montre le tableau de bord, jamais le questionnaire directement.
 * Les questions perso étaient auparavant cachées derrière les 22 questions du
 * questionnaire : personne ne découvrait la fonctionnalité avant d'avoir tout rempli,
 * alors que l'hôte envoie justement le lien à l'avance pour ça.
 */
function openQuizOrDone() {
  renderDone();
}

/** Ouvre le questionnaire à la première question sans réponse. */
function ouvrirQuiz() {
  const total = state.game.questionIds.length;
  state.idx = state.game.questionIds.findIndex(q => !state.answers[q]);
  if (state.idx < 0) state.idx = 0;
  renderQuestion();
  showScreen('screen-quiz');
}

function coupleNames() {
  const mine = state.players.filter(p => p.coupleId === state.me?.coupleId);
  const a = mine.find(p => p.slot === 'A');
  const b = mine.find(p => p.slot === 'B');
  return {
    nameA: a ? a.name : (state.me?.slot === 'A' ? state.me.name : 'Ton/ta partenaire'),
    nameB: b ? b.name : (state.me?.slot === 'B' ? state.me.name : 'Ton/ta partenaire'),
    genderA: a ? (a.gender || 'n') : 'n',
    genderB: b ? (b.gender || 'n') : 'n'
  };
}

/** Genre du joueur courant et de son partenaire — pour accorder les énoncés. */
function mesGenres() {
  const mine = state.players.filter(p => p.coupleId === state.me?.coupleId);
  const autre = mine.find(p => p.uid !== uid());
  return { moi: state.me?.gender || 'n', autre: autre ? (autre.gender || 'n') : 'n' };
}

function renderQuestion() {
  const ids = state.game.questionIds;
  const q = byId(ids[state.idx]);
  if (!q) return;
  const total = ids.length;

  $('#quizBar').style.width = ((state.idx) / total * 100).toFixed(1) + '%';
  $('#quizCount').textContent = `${state.idx + 1} / ${total}`;
  const th = THEMES[q.t];
  const gg = mesGenres();
  $('#quizTheme').innerHTML = `${iconHtml(th.icon)} ${th.label}`;
  $('#quizQuestion').textContent = selfPrompt(q, gg.moi, gg.autre);
  $('#btnQuizPrev').disabled = state.idx === 0;

  const box = $('#quizOptions');
  box.innerHTML = '';
  const opts = optionsFor(q, coupleNames(), gg.moi);
  const picked = state.answers[q.i];
  opts.forEach((o, k) => {
    const b = el('button', {
      class: 'opt' + (picked === o.token ? ' is-picked' : ''),
      'data-token': o.token
    }, el('span', { class: 'opt-key' }, 'ABCD'[k]), el('span', {}, o.label));
    b.addEventListener('click', () => pick(q, o.token));
    box.append(b);
  });
}

/** Re-render silencieux quand un prénom de partenaire arrive après coup. */
function refreshQuizOptions() {
  if (!$('#screen-quiz').classList.contains('is-active')) return;
  const q = byId(state.game?.questionIds[state.idx]);
  if (q && q.k === 'who') renderQuestion();
}

async function pick(q, token) {
  state.answers[q.i] = token;
  sfx.tap();
  $$('#quizOptions .opt').forEach(b => b.classList.toggle('is-picked', b.dataset.token === token));

  const total = state.game.questionIds.length;
  const answered = state.game.questionIds.filter(x => state.answers[x]).length;
  saveAnswer(state.code, q.i, token, answered, total)
    .catch(() => toast('Réponse non enregistrée, vérifie ta connexion.', 'err'));

  setTimeout(() => {
    if (state.idx < total - 1) { state.idx++; renderQuestion(); }
    else { sfx.win(); burst('hearts', 60); renderDone(); }
  }, 190);
}

$('#btnQuizPrev')?.addEventListener('click', () => {
  if (state.idx > 0) { state.idx--; renderQuestion(); sfx.tap(); }
});

function renderDone() {
  const ids = state.game.questionIds;
  const total = ids.length;
  const answered = ids.filter(q => state.answers[q]).length;
  const fini = answered >= total;
  const n = state.custom.length;
  const max = state.game?.maxCustom || 3;
  const tonPerso = estTonPerso(state.game?.spice);

  // En ton « Questions perso », la carte questionnaire disparaît : faire remplir
  // 19 questions qui ne seront jamais jouées serait absurde.
  $('#hubQuiz').hidden = tonPerso;

  if (tonPerso) {
    $('#doneTitle').textContent = n ? 'C\'est prêt' : 'À toi d\'écrire';
    $('#doneLine').textContent = n
      ? "Tes questions sont scellées. Ton/ta partenaire ne peut pas les voir."
      : "Cette partie ne se joue qu'avec vos propres questions. Aucun questionnaire à remplir.";
  } else {
    $('#doneTitle').textContent = fini && n
      ? 'Tout est prêt'
      : fini ? 'Plus qu\'une chose (facultative)' : 'Deux choses à préparer';
    $('#doneLine').textContent = fini && n
      ? "Rien ne peut être vu par ton/ta partenaire. Rendez-vous devant l'écran de l'animateur."
      : "Prends le temps, tu peux revenir sur ce lien autant de fois que tu veux.";
  }

  $('#hubQuizState').textContent = fini
    ? `${total} réponses enregistrées`
    : `${answered} sur ${total}`;
  $('#hubQuizBar').style.width = (answered / total * 100).toFixed(1) + '%';
  $('#hubQuizCheck').hidden = !fini;
  $('#btnDoneEdit').textContent = fini ? 'Modifier mes réponses'
    : answered ? 'Reprendre où j\'en étais' : 'Commencer';
  $('#btnDoneEdit').className = fini ? 'btn btn-ghost' : 'btn btn-primary btn-xl';

  $('#hubPersoState').textContent = n
    ? `${n} question${n > 1 ? 's' : ''} écrite${n > 1 ? 's' : ''} sur ${max} possibles`
    : tonPerso
      ? `Écris jusqu'à ${max} questions pour ton/ta partenaire`
      : 'Facultatif, mais c\'est ce qui fait les meilleures parties';
  $('#hubPersoCheck').hidden = !n;
  $('#btnGoCustom').innerHTML = (n ? 'Modifier mes questions ' : 'Écrire mes questions ')
    + iconHtml('wand-magic-sparkles');
  $('#btnGoCustom').className = (n && !tonPerso) ? 'btn btn-gold btn-xl' : 'btn btn-gold btn-xl';

  $('#doneRecap').textContent = tonPerso
    ? (n ? "L'animateur lancera la partie quand tout le monde aura écrit." : '')
    : (fini && n ? "L'animateur choisira de jouer vos questions ou celles de Bibi Love." : '');
  showScreen('screen-done');
}

$('#btnGoCustom')?.addEventListener('click', () => enterCustom());

$('#btnDoneEdit')?.addEventListener('click', () => ouvrirQuiz());
$('#btnQuizHub')?.addEventListener('click', () => { sfx.tap(); renderDone(); });

export function leavePlayer() {
  if (state.unsub) { state.unsub(); state.unsub = null; }
  if (state.unsubGame) { state.unsubGame(); state.unsubGame = null; }
}

/* ══════════════ MANETTE : la partie en direct sur le téléphone ══════════════
 * Le joueur ne « pilote » rien : il réagit à ce que l'hôte diffuse dans
 * games/{code}.live.bc. Cet écran est donc entièrement dérivé du broadcast,
 * sans état local propre — c'est ce qui le rend insensible à un rechargement
 * de page en pleine partie.
 */

function onGameUpdate(g) {
  if (g.status === 'lobby') return;             // phase questionnaire, rien à faire
  const bc = g.bc;
  if (!bc) return;
  if (!state.me) return;                        // spectateur non inscrit

  if (bc.phase === PHASE.FINI) { renderRecap(g, bc); return; }
  if (bc.seq === state.lastSeq && bc.phase === 'question') return;

  if (bc.phase === PHASE.QUESTION) { state.lastSeq = bc.seq; renderTour(bc); }
  else if (bc.phase === PHASE.REVEAL) renderResultat(bc);
}

function monCouple() {
  return (state.game?.couples || []).find(c => c.id === state.me?.coupleId) || null;
}

function majEnteteLive(bc) {
  const titres = { 1: 'Manche 1', 2: 'Manche 2', 3: 'Manche bonus', final: 'La Finale' };
  $('#playRound').textContent = titres[bc.round] || 'En jeu';
  const c = monCouple();
  const score = c && bc.scores ? (bc.scores[c.id] ?? 0) : 0;
  $('#playScore').innerHTML = c ? `${iconHtml('star')} ${score} pts` : '';
}

/**
 * Tout le monde voit la question, pas seulement celui qui doit répondre.
 * C'est ce qui supprime les « il a dit quoi ? » : chacun lit le même énoncé sur son
 * téléphone, et les réponses s'affichent au même instant pour toute la table quand
 * l'animateur valide.
 */
function renderTour(bc) {
  majEnteteLive(bc);
  showScreen('screen-play');

  const monTour = estMonTour(bc, uid());
  const texte = bc.kind === 'texte';
  const aMoi = bc.sourceUid === uid();

  $('#playResult').hidden = true;
  $('#playWait').hidden = true;
  $('#playTurn').hidden = false;

  $('#playWho').innerHTML = bc.perso
    ? `${iconHtml('wand-magic-sparkles')} Question de <b>${bc.sourceName || ''}</b>`
    : `Qu'a répondu <b>${bc.sourceName || ''}</b> ?`;
  $('#playQuestion').textContent = bc.prompt || '';

  $('#playOptions').hidden = !(monTour && !texte);
  $('#playTexte').hidden = !(monTour && texte);
  $('#playSpectate').hidden = monTour;

  if (monTour && !texte) {
    const box = $('#playOptions');
    box.innerHTML = '';
    (bc.options || []).forEach((o, k) => {
      const b = el('button', { class: 'opt', 'data-token': o.token },
        el('span', { class: 'opt-key' }, 'ABCD'[k]), el('span', {}, o.label));
      b.addEventListener('click', () => envoyerChoix(bc, { token: o.token }));
      box.append(b);
    });
  }

  if (monTour && texte) {
    const input = $('#playTexteInput');
    input.value = '';
    input.disabled = false;
    $('#btnPlaySendTexte').disabled = false;
    $('#btnPlaySendTexte').textContent = 'Envoyer ma réponse';
    setTimeout(() => input.focus(), 150);
  }

  if (!monTour) {
    $('#playSpectate').textContent = aMoi
      ? `${bc.guesserName || 'Ton/ta partenaire'} essaie de répondre. Pas un mot.`
      : `${bc.guesserName || 'Le joueur'} répond pour ${bc.coupleName || 'son couple'}. ` +
        pioche(ATTENTE, 'attente');
  }
  sfx.reveal();
}

async function envoyerChoix(bc, payload) {
  if (state.sent === bc.seq) return;            // un seul envoi par question
  state.sent = bc.seq;
  sfx.tap();
  if (payload.token) {
    $$('#playOptions .opt').forEach(b => {
      b.classList.toggle('is-picked', b.dataset.token === payload.token);
      b.disabled = true;
    });
  } else {
    $('#playTexteInput').disabled = true;
    $('#btnPlaySendTexte').disabled = true;
    $('#btnPlaySendTexte').textContent = 'Réponse envoyée';
  }
  try { await sendGuess(state.code, Object.assign({ seq: bc.seq }, payload)); }
  catch {
    toast("Réponse non transmise. Dis-la à voix haute.", 'err');
    state.sent = -1;
    $('#playTexteInput').disabled = false;
    $('#btnPlaySendTexte').disabled = false;
  }
}

$('#btnPlaySendTexte')?.addEventListener('click', () => {
  const bc = state.game?.bc;
  if (!bc) return;
  const text = $('#playTexteInput').value.trim();
  if (text.length < 1) { toast("Écris quelque chose, même une bêtise.", 'err'); return; }
  envoyerChoix(bc, { text });
});

function renderResultat(bc) {
  majEnteteLive(bc);
  showScreen('screen-play');
  const concerne = bc.guesserUid === uid() || bc.sourceUid === uid();

  $('#playTurn').hidden = true;
  $('#playWait').hidden = true;
  $('#playResult').hidden = false;

  const ok = !!bc.correct;
  $('#playResult').className = 'play-result ' + (ok ? 'is-ok' : 'is-ko');
  $('#playResultIcon').innerHTML = iconHtml(ok ? 'heart' : 'heart-crack');
  $('#playResultTitle').textContent = ok
    ? (bc.points ? `Bonne réponse · +${bc.points}` : 'Bonne réponse')
    : 'Mauvaise réponse';

  // Les deux réponses côte à côte : plus personne ne se demande qui avait dit quoi.
  const donnee  = bc.kind === 'texte' ? bc.given  : bc.pickedLabel;
  const attendue = bc.kind === 'texte' ? bc.expected : bc.truthLabel;
  const box = $('#playResultAnswers');
  if (donnee || attendue) {
    box.hidden = false;
    box.innerHTML = '';
    if (donnee) box.append(el('div', { class: 'play-answer' },
      el('span', { class: 'play-answer-label' }, `${bc.guesserName || 'Réponse donnée'}`),
      el('span', { class: 'play-answer-val' }, donnee)));
    if (attendue) box.append(el('div', { class: 'play-answer is-truth' },
      el('span', { class: 'play-answer-label' }, `${bc.sourceName || 'La bonne réponse'}`),
      el('span', { class: 'play-answer-val' }, attendue)));
  } else box.hidden = true;

  $('#playResultLine').textContent = concerne
    ? pioche(ok ? REACT_GOOD : REACT_BAD, ok ? 'g' : 'b')
    : `${bc.coupleName || 'Le couple'} : ${ok ? 'ils assurent.' : 'ça pique.'}`;

  if (!concerne) return;
  if (ok) { sfx.good(); burst('hearts', 20); }
  else { sfx.bad(); shake($('#playResult')); }
}

function renderRecap(g, bc) {
  const scores = bc.scores || {};
  const ranked = [...(g.couples || [])].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const c = monCouple();
  const pos = c ? ranked.findIndex(x => x.id === c.id) : -1;

  const board = $('#recapBoard');
  board.innerHTML = '';
  const ICONS = ['trophy', 'medal', 'award', 'star'];
  ranked.forEach((x, i) => {
    board.append(el('div', { class: 'podium-row' + (i === 0 ? ' is-first' : '') + (c && x.id === c.id ? ' is-mine' : '') },
      el('span', { class: 'podium-rank' }, icon(ICONS[i] || 'star')),
      el('span', { class: 'podium-name' }, x.name),
      el('span', { class: 'podium-pts' }, String(scores[x.id] || 0))));
  });

  const cle = pos === 0 ? 'first' : (pos === ranked.length - 1 && ranked.length > 1 ? 'last' : 'middle');
  $('#recapIcon').innerHTML = iconHtml(pos === 0 ? 'trophy' : cle === 'last' ? 'heart-crack' : 'medal');
  $('#recapTitle').textContent = pos === 0 ? 'Vous gagnez' : cle === 'last' ? 'Bon…' : 'Pas mal';
  $('#recapLine').textContent = pioche(RECAP_JOUEUR[cle], 'recap');

  if (pos === 0) { sfx.win(); burst('confetti', 90); } else if (cle === 'last') sfx.lose();
  showScreen('screen-recap');
}

/* ══════════════ QUESTIONS PERSONNALISÉES ══════════════
 * Le joueur écrit des questions POUR son/sa partenaire, avec les réponses possibles
 * et la bonne. C'est lui qui détient la vérité : pendant la partie il devient la
 * « source » et l'autre doit retrouver ce qu'il avait en tête. Le contenu n'est
 * jamais lisible par le/la partenaire (règles Firestore) — sinon tout l'intérêt
 * tombe.
 */

let brouillon = null;   // { q, a } en cours d'édition
let editIdx = -1;       // index modifié, -1 = nouvelle question

function brouillonVide() { return { q: '', a: '' }; }

export async function enterCustom() {
  if (!state.code || !state.me) { location.hash = '#/'; return; }
  state.custom = await myCustom(state.code);
  brouillon = brouillonVide(); editIdx = -1;
  renderCustom();
  renderIdees();
  showScreen('screen-custom');
}

function partenaireNom() {
  const mine = state.players.filter(p => p.coupleId === state.me?.coupleId);
  const autre = mine.find(p => p.uid !== uid());
  return autre ? autre.name : 'ton/ta partenaire';
}

function renderCustom() {
  // La limite vient de la partie, pas du plan de cet appareil : l'organisateur a payé
  // pour toute la table.
  const max = state.game?.maxCustom || 3;
  const n = state.custom.length;
  $('#customCount').textContent = `${n}/${max}`;
  $('#customIntro').innerHTML =
    `Écris des questions que <strong>${partenaireNom()}</strong> devra deviner pendant la soirée, ` +
    `avec la réponse que tu attends. L'animateur comparera les deux à l'écran — ` +
    `et ${partenaireNom()} ne verra rien avant le jour J.`;

  const box = $('#customList');
  box.innerHTML = '';
  state.custom.forEach((it, i) => {
    const row = el('div', { class: 'custom-item' },
      el('div', { class: 'custom-item-main' },
        el('div', { class: 'custom-item-q' }, it.q),
        el('div', { class: 'custom-item-o' }, icon('circle-check'), ' ' + (it.a || ''))),
      el('button', { class: 'custom-item-btn', title: 'Modifier' }, icon('wand-magic-sparkles')),
      el('button', { class: 'custom-item-btn is-danger', title: 'Supprimer' }, icon('trash')));
    row.children[1].addEventListener('click', () => editer(i));
    row.children[2].addEventListener('click', () => supprimer(i));
    box.append(row);
  });

  const plein = n >= max && editIdx === -1;
  $('#customForm').hidden = plein;
  $('#customFormTitle').textContent = editIdx === -1 ? 'Nouvelle question' : 'Modifier la question';
  $('#btnCustomCancel').hidden = editIdx === -1;
  $('#btnCustomSave').textContent = editIdx === -1 ? 'Ajouter la question' : 'Enregistrer';
  $('#customQ').value = brouillon.q;
  $('#customA').value = brouillon.a;

  if (plein) toast(`Limite atteinte : ${max} questions.`, 'info');
}

function editer(i) {
  const it = state.custom[i];
  brouillon = { q: it.q, a: it.a || '' };
  editIdx = i;
  renderCustom();
  $('#customForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function supprimer(i) {
  showConfirmModal(`Supprimer « ${state.custom[i].q} » ?`, async () => {
    state.custom.splice(i, 1);
    if (editIdx === i) { brouillon = brouillonVide(); editIdx = -1; }
    await persistCustom();
    renderCustom();
  }, { danger: true, okLabel: 'Supprimer' });
}

async function persistCustom() {
  try { await saveCustom(state.code, state.custom); }
  catch { toast("Enregistrement impossible, vérifie ta connexion.", 'err'); }
}

$('#btnCustomCancel')?.addEventListener('click', () => {
  brouillon = brouillonVide(); editIdx = -1; renderCustom();
});

$('#btnCustomSave')?.addEventListener('click', async () => {
  const q = $('#customQ').value.trim();
  const a = $('#customA').value.trim();
  if (q.length < 8) { toast("La question est un peu courte.", 'err'); return; }
  if (a.length < 1) { toast("Il manque la réponse que tu attends.", 'err'); return; }

  const item = { q, a };
  if (editIdx === -1) state.custom.push(item); else state.custom[editIdx] = item;

  brouillon = brouillonVide(); editIdx = -1;
  await persistCustom();
  sfx.good(); burst('hearts', 14);
  renderCustom();
  $('#customList').scrollIntoView({ behavior: 'smooth', block: 'end' });
});

$('#btnCustomBack')?.addEventListener('click', () => renderDone());
$('#btnCustomDone')?.addEventListener('click', () => {
  sfx.win(); burst('confetti', 40); renderDone();
});

/* ── Boîte à idées ──────────────────────────────────────────────────────── */
function renderIdees() {
  const box = $('#ideasList');
  box.innerHTML = '';
  tirerIdees(3).forEach(idee => {
    const b = el('button', { class: 'idee' },
      el('span', { class: 'idee-tag' }, idee.t),
      el('span', { class: 'idee-q' }, idee.q));
    b.addEventListener('click', () => {
      $('#customQ').value = idee.q;
      brouillon.q = idee.q;
      sfx.tap();
      $('#customForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    box.append(b);
  });
}
$('#btnIdeasMore')?.addEventListener('click', () => { renderIdees(); sfx.tap(); });
