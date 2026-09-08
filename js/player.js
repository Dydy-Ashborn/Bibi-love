/* Bibi Love — parcours joueur : rejoindre puis répondre en amont.
 * Le joueur ne voit jamais les réponses de son conjoint (règles Firestore). */
import { $, $$, el, showScreen, toast, sfx, burst, shuffle } from './util.js';
import { byId, optionsFor, selfPrompt } from './game.js';
import { THEMES, SPICE } from './data/questions.js';
import { loadGame, joinGame, myPlayer, myAnswers, saveAnswer, watchPlayers, uid } from './store.js';
import { RULES } from './config.js';

const state = {
  code: null, game: null, players: [], me: null,
  answers: {}, idx: 0, unsub: null
};

const LS_NAME = 'bibi.player.name';

export async function enterJoin(code) {
  state.code = code;
  const game = await loadGame(code);
  if (!game) { toast("Ce code ne correspond à aucune partie.", 'err'); location.hash = '#/'; return; }
  state.game = game;

  if (state.unsub) state.unsub();
  state.unsub = watchPlayers(code, list => { state.players = list; renderJoin(); refreshQuizOptions(); });

  state.me = await myPlayer(code);
  state.answers = await myAnswers(code);

  if (state.me) { openQuizOrDone(); return; }
  renderJoin();
  showScreen('screen-join');
}

/* ── Écran « rejoindre » ───────────────────────────────────────── */
function renderJoin() {
  const g = state.game;
  if (!g) return;
  const sp = SPICE[g.spice] || SPICE[1];
  const spiceLabel = `${sp.label} ${sp.emoji}`;
  const total = g.questionIds.length;
  $('#joinMeta').innerHTML =
    `Ambiance <strong>${spiceLabel}</strong> · ${total} questions · environ ${Math.ceil(total * 0.35)} minutes.<br>` +
    `Réponds <strong>pour toi</strong> : ton/ta partenaire devra deviner ce que tu as mis.`;

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

$('#btnJoinConfirm')?.addEventListener('click', async () => {
  const name = $('#inputName').value.trim();
  if (name.length < 2) { toast('Il me faut ton prénom.', 'err'); return; }
  if (!state.pickedCouple) { toast('Choisis ton couple.', 'err'); return; }
  const taken = state.players.filter(p => p.coupleId === state.pickedCouple);
  if (taken.length >= 2) { toast('Ce couple est complet.', 'err'); return; }
  const slot = taken.length === 0 ? 'A' : (taken[0].slot === 'A' ? 'B' : 'A');

  localStorage.setItem(LS_NAME, name);
  await joinGame(state.code, { name, coupleId: state.pickedCouple, slot });
  state.me = await myPlayer(state.code);
  sfx.good(); burst('hearts', 24);
  openQuizOrDone();
});

/* ── Questionnaire ─────────────────────────────────────────────── */
function openQuizOrDone() {
  const total = state.game.questionIds.length;
  const answered = state.game.questionIds.filter(q => state.answers[q]).length;
  if (answered >= total) { renderDone(); return; }
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
    nameB: b ? b.name : (state.me?.slot === 'B' ? state.me.name : 'Ton/ta partenaire')
  };
}

function renderQuestion() {
  const ids = state.game.questionIds;
  const q = byId(ids[state.idx]);
  if (!q) return;
  const total = ids.length;

  $('#quizBar').style.width = ((state.idx) / total * 100).toFixed(1) + '%';
  $('#quizCount').textContent = `${state.idx + 1} / ${total}`;
  const th = THEMES[q.t];
  $('#quizTheme').textContent = `${th.emoji} ${th.label}`;
  $('#quizQuestion').textContent = selfPrompt(q);
  $('#btnQuizPrev').disabled = state.idx === 0;

  const box = $('#quizOptions');
  box.innerHTML = '';
  const opts = optionsFor(q, coupleNames());
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
  const total = state.game.questionIds.length;
  const answered = state.game.questionIds.filter(q => state.answers[q]).length;
  $('#doneLine').textContent = answered >= total
    ? "Tes réponses sont scellées. Ton/ta partenaire ne peut pas les voir — c'est tout l'intérêt."
    : `Il te reste ${total - answered} question(s).`;
  $('#doneRecap').innerHTML =
    `<strong>${answered}/${total}</strong> réponses enregistrées.<br>Rendez-vous devant l'écran de l'animateur le jour J.`;
  $('#btnDoneEdit').textContent = answered >= total ? 'Modifier mes réponses' : 'Reprendre où j\'en étais';
  showScreen('screen-done');
}

$('#btnDoneEdit')?.addEventListener('click', () => {
  state.idx = 0;
  renderQuestion();
  showScreen('screen-quiz');
});

export function leavePlayer() { if (state.unsub) { state.unsub(); state.unsub = null; } }
