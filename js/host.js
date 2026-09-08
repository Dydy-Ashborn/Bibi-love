/* Bibi Love — parcours hôte : création, salon, plateau, podium.
 * L'hôte est le seul à lire les réponses des joueurs (règles Firestore). */
import { $, $$, el, showScreen, toast, sfx, burst, shake, showConfirmModal, copy, initials } from './util.js';
import { RULES } from './config.js';
import {
  byId, buildPlan, optionsFor, guessPrompt, isCorrect,
  ROUND_TITLES, roundSubtitle, rankFor, questionCount
} from './game.js';
import {
  createGame, loadGame, watchGame, watchPlayers, patchGame,
  deleteGame, allAnswers, hostGames, uid
} from './store.js';

/* ══════════════ ÉTAT ══════════════ */
const cfg = { mode: 'duo', pairing: 'mixte', spice: 1, durationMin: 45,
              couples: [{ name: 'Le couple' }] };

const H = {
  code: null, game: null, players: [], answers: {},
  unsubGame: null, unsubPlayers: null,
  plan: null, round: 1, qIdx: 0, coupleIdx: 0, phase: 'question',
  picked: null, scores: {}, stats: { asked: 0, correct: 0 },
  finalist: null, final: null, timerId: null
};

/* ══════════════ CRÉATION ══════════════ */
export function enterCreate() {
  syncCreateUI();
  renderCouplesList();
  showScreen('screen-create');
}

$$('.choice-grid[data-field]').forEach(grid => {
  grid.addEventListener('click', e => {
    const btn = e.target.closest('.choice');
    if (!btn || btn.disabled) return;
    const field = grid.dataset.field;
    let v = btn.dataset.value;
    if (field === 'spice' || field === 'durationMin') v = Number(v);
    cfg[field] = v;
    $$('.choice', grid).forEach(b => b.classList.toggle('is-on', b === btn));
    sfx.tap();
    if (field === 'mode') {
      if (v === 'duo') cfg.couples = [{ name: cfg.couples[0]?.name || 'Le couple' }];
      else if (cfg.couples.length < 2) cfg.couples = [{ name: 'Couple 1' }, { name: 'Couple 2' }];
      renderCouplesList();
    }
    syncCreateUI();
  });
});

function syncCreateUI() {
  for (const [field, val] of Object.entries(cfg)) {
    const grid = $(`.choice-grid[data-field="${field}"]`);
    if (!grid) continue;
    $$('.choice', grid).forEach(b => b.classList.toggle('is-on', b.dataset.value === String(val)));
  }
  $('#cardCouples').hidden = false;
  $('#btnAddCouple').hidden = cfg.mode === 'duo' || cfg.couples.length >= RULES.MAX_COUPLES;
  const { perRound, total } = questionCount(cfg.durationMin);
  $('#createSummary').textContent =
    `${total} questions à remplir en amont · 3 manches de ${perRound} + une finale de ${RULES.FINAL_QUESTIONS} questions.`;
}

function renderCouplesList() {
  const box = $('#couplesList');
  box.innerHTML = '';
  cfg.couples.forEach((c, i) => {
    const input = el('input', { class: 'input', value: c.name, maxlength: 22,
                                placeholder: 'Couple ' + (i + 1) });
    input.addEventListener('input', () => { cfg.couples[i].name = input.value; });
    const row = el('div', { class: 'couple-row' }, input);
    if (cfg.mode === 'tournoi' && cfg.couples.length > 2) {
      const del = el('button', { class: 'couple-del', title: 'Retirer' }, '✕');
      del.addEventListener('click', () => { cfg.couples.splice(i, 1); renderCouplesList(); syncCreateUI(); });
      row.append(del);
    }
    box.append(row);
  });
}

$('#btnAddCouple')?.addEventListener('click', () => {
  if (cfg.couples.length >= RULES.MAX_COUPLES) return;
  cfg.couples.push({ name: 'Couple ' + (cfg.couples.length + 1) });
  renderCouplesList(); syncCreateUI(); sfx.tap();
});

$('#btnCreateGame')?.addEventListener('click', async () => {
  const btn = $('#btnCreateGame');
  btn.disabled = true; btn.textContent = 'Création…';
  try {
    const game = await createGame(cfg);
    H.code = game.code;
    showShare(game.code);
  } catch (e) {
    console.error(e);
    toast("Création impossible. Vérifie les règles Firestore.", 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'Générer le lien 🔗';
  }
});

/* ══════════════ PARTAGE ══════════════ */
function joinUrl(code) {
  return location.origin + location.pathname + '#/j/' + code;
}
function showShare(code) {
  $('#shareCode').textContent = code;
  $('#shareLink').textContent = joinUrl(code);
  showScreen('screen-share');
  burst('confetti', 60); sfx.win();
}
$('#btnCopyLink')?.addEventListener('click', async () => {
  const ok = await copy($('#shareLink').textContent);
  toast(ok ? 'Lien copié 📋' : 'Copie impossible, sélectionne le lien.', ok ? 'ok' : 'err');
});
$('#btnShareLink')?.addEventListener('click', async () => {
  const url = $('#shareLink').textContent;
  if (navigator.share) { try { await navigator.share({ title: 'Bibi Love', text: 'Réponds avant la soirée 😏', url }); } catch {} }
  else { const ok = await copy(url); toast(ok ? 'Lien copié 📋' : 'Copie impossible.', ok ? 'ok' : 'err'); }
});
$('#btnGoLobby')?.addEventListener('click', () => { location.hash = '#/host/' + H.code; });
$('#btnLobbyShare')?.addEventListener('click', async () => {
  const ok = await copy(joinUrl(H.code));
  toast(ok ? 'Lien copié 📋' : joinUrl(H.code), ok ? 'ok' : 'info');
});

/* ══════════════ SALON ══════════════ */
export async function enterLobby(code) {
  H.code = code;
  const game = await loadGame(code);
  if (!game) { toast("Partie introuvable.", 'err'); location.hash = '#/'; return; }
  if (game.hostUid !== uid()) {
    toast("Cette partie a été créée sur un autre appareil.", 'err');
    location.hash = '#/j/' + code; return;
  }
  H.game = game;
  $('#lobbyCode').textContent = code;

  detach();
  H.unsubGame = watchGame(code, g => { if (g) { H.game = g; renderLobby(); } });
  H.unsubPlayers = watchPlayers(code, list => { H.players = list; renderLobby(); });
  showScreen('screen-lobby');
}

function coupleOf(c) {
  const mates = H.players.filter(p => p.coupleId === c.id);
  return { A: mates.find(p => p.slot === 'A') || null, B: mates.find(p => p.slot === 'B') || null };
}

function renderLobby() {
  const g = H.game; if (!g) return;
  const total = g.questionIds.length;
  const box = $('#lobbyCouples');
  box.innerHTML = '';
  let ready = 0, expected = g.couples.length * 2;

  g.couples.forEach(c => {
    const { A, B } = coupleOf(c);
    const slots = el('div', { class: 'lobby-slots' });
    [['A', A], ['B', B]].forEach(([slot, p]) => {
      if (!p) {
        slots.append(el('div', { class: 'slot is-empty' },
          el('div', { class: 'avatar' }, '?'),
          el('div', {}, el('div', { class: 'slot-name' }, 'En attente'),
                        el('div', { class: 'slot-state' }, 'Place ' + slot))));
        return;
      }
      const done = (p.answered || 0) >= total;
      if (done) ready++;
      slots.append(el('div', { class: 'slot' + (done ? ' is-done' : '') },
        el('div', { class: 'avatar' }, initials(p.name)),
        el('div', {}, el('div', { class: 'slot-name' }, p.name),
          el('div', { class: 'slot-state' }, done ? '✓ Prêt' : `${p.answered || 0}/${total} réponses`))));
    });
    box.append(el('div', { class: 'lobby-couple' }, el('h3', {}, c.name), slots));
  });

  const resumable = canResume(g);
  $('#lobbyStatus').innerHTML = resumable
    ? `Partie en cours — <strong>${resumeLabel(g)}</strong>. Les scores ont été sauvegardés, tu reprends exactement où tu t'es arrêté.`
    : `<strong>${ready}/${expected}</strong> joueurs prêts. Tu peux lancer dès que tout le monde a fini — ` +
      `les réponses manquantes compteront comme fausses.`;
  const btn = $('#btnStartLive');
  btn.textContent = resumable ? '▶️ Reprendre la partie'
                  : g.status === 'finished' ? '🔁 Relancer une partie'
                  : '🎬 Lancer la partie';
  btn.disabled = H.players.length < 2;
}

/** Une partie est reprenable si elle a été lancée et n'est pas terminée. */
function canResume(g) {
  return g && g.status === 'live' && g.live && g.live.phase && g.live.phase !== 'idle';
}

function resumeLabel(g) {
  const L = g.live;
  if (L.round === 'final') return `finale, question ${(L.final?.idx || 0) + 1}/${RULES.FINAL_QUESTIONS}`;
  return `manche ${L.round}, question ${(L.qIdx || 0) + 1}/${g.perRound}`;
}

$('#btnStartLive')?.addEventListener('click', () => {
  if (canResume(H.game)) { startLive(true); return; }

  const total = H.game.questionIds.length;
  const late = H.players.filter(p => (p.answered || 0) < total).map(p => p.name);
  const go = () => startLive(false);

  if (H.game.status === 'finished') {
    showConfirmModal(
      "Cette partie est terminée. La relancer remet tous les scores à zéro sur les mêmes questions. On y va ?",
      go, { okLabel: 'Relancer' });
    return;
  }
  if (late.length) {
    showConfirmModal(
      `${late.join(', ')} n'${late.length > 1 ? 'ont' : 'a'} pas terminé. Leurs questions sans réponse seront perdues. On lance quand même ?`,
      go, { okLabel: 'Lancer la partie' });
  } else go();
});

$('#btnDeleteGame')?.addEventListener('click', () => {
  showConfirmModal("Supprimer définitivement cette partie et toutes les réponses ?", async () => {
    await deleteGame(H.code); toast('Partie supprimée.', 'ok'); location.hash = '#/';
  }, { danger: true, okLabel: 'Supprimer' });
});

/* ══════════════ PLATEAU ══════════════ */
/**
 * Lance ou reprend le plateau.
 * @param {boolean} resume true = repart de l'état sauvegardé dans games/{code}.live
 */
async function startLive(resume = false) {
  const g = H.game;
  H.answers = await allAnswers(H.code, H.players);
  H.plan = buildPlan(g.questionIds, g.perRound);

  if (resume && canResume(g)) {
    const L = g.live;
    H.round     = L.round;
    H.qIdx      = L.qIdx || 0;
    H.coupleIdx = L.coupleIdx || 0;
    H.scores    = Object.assign({}, L.scores);
    H.stats     = Object.assign({ asked: 0, correct: 0 }, L.stats);
    H.finalist  = L.finalistId ? g.couples.find(c => c.id === L.finalistId) || null : null;
    H.final     = L.final ? Object.assign({}, L.final) : null;
    g.couples.forEach(c => { if (H.scores[c.id] == null) H.scores[c.id] = 0; });
    H.phase = 'question'; H.picked = null;
    showScreen('screen-live');

    // La sauvegarde a eu lieu après la révélation : on enchaîne sur la question suivante
    // au lieu de reproposer celle déjà jouée (sinon les points seraient comptés deux fois).
    if (L.phase === 'reveal') {
      if (H.round === 'final') { resumeFinalTimer(); nextFinal(); }
      else advance();
      return;
    }
    if (H.round === 'final') { renderLive(); resumeFinalTimer(); }
    else renderLive();
    toast('Partie reprise là où tu en étais.', 'ok');
    return;
  }

  H.round = 1; H.qIdx = 0; H.coupleIdx = 0; H.phase = 'question'; H.picked = null;
  H.stats = { asked: 0, correct: 0 };
  H.finalist = null; H.final = null;
  H.scores = {}; g.couples.forEach(c => { H.scores[c.id] = 0; });
  await patchGame(H.code, { status: 'live', finalResult: null, finalistId: null }).catch(() => {});
  showScreen('screen-live');
  renderLive();
  persistLive();
}

/**
 * Sauvegarde l'état du plateau dans le doc de partie.
 * Appelée à chaque transition (révélation, question suivante, manche suivante) :
 * un rafraîchissement de page ou un changement d'appareil ne perd plus les scores.
 * Volontairement non bloquante — un échec réseau ne doit jamais figer le jeu.
 */
function persistLive() {
  if (!H.code) return;
  patchGame(H.code, {
    live: {
      started: true,
      round: H.round,
      qIdx: H.qIdx,
      coupleIdx: H.coupleIdx,
      phase: H.phase,
      scores: H.scores,
      stats: H.stats,
      finalistId: H.finalist ? H.finalist.id : null,
      final: H.final ? {
        idx: H.final.idx, correct: H.final.correct,
        errors: H.final.errors, left: H.final.left, over: !!H.final.over
      } : null,
      updatedAt: Date.now()
    }
  }).catch(() => { /* silencieux : la partie continue en mémoire */ });
}

function names(c) {
  const { A, B } = coupleOf(c);
  return { nameA: A ? A.name : 'Joueur A', nameB: B ? B.name : 'Joueur B', A, B };
}

function currentStep() {
  if (H.round === 'final') return H.plan.final[H.final.idx];
  return H.plan.rounds[H.round - 1][H.qIdx];
}
function currentCouple() {
  if (H.round === 'final') return H.finalist;
  return H.game.couples[H.coupleIdx];
}

function renderScores(bumpId) {
  const box = $('#liveScores');
  box.innerHTML = '';
  H.game.couples.forEach((c, i) => {
    const turn = H.round !== 'final' && i === H.coupleIdx;
    const chip = el('div', { class: 'score-chip' + (turn ? ' is-turn' : '') },
      el('b', { class: bumpId === c.id ? 'score-bump' : '' }, String(H.scores[c.id] ?? 0)),
      el('span', {}, c.name));
    box.append(chip);
  });
}

function renderLive() {
  const g = H.game;
  const couple = currentCouple();
  const n = names(couple);
  const step = currentStep();
  const q = byId(step.qid);

  $('#liveRoundTitle').textContent = ROUND_TITLES[H.round];
  $('#liveRoundSub').textContent = roundSubtitle(H.round, g.pairing, n);
  renderScores();

  const source  = step.source === 'A' ? n.A : n.B;
  const guesser = step.source === 'A' ? n.B : n.A;
  const sourceName  = source  ? source.name  : (step.source === 'A' ? n.nameA : n.nameB);
  const guesserName = guesser ? guesser.name : (step.source === 'A' ? n.nameB : n.nameA);

  $('#liveTurn').innerHTML = H.round === 'final'
    ? `<b>${guesserName}</b>, réponds vite : que pense <b>${sourceName}</b> ?`
    : `<b>${couple.name}</b> — <b>${guesserName}</b> devine ce qu'a répondu <b>${sourceName}</b>`;

  $('#liveQuestion').textContent = guessPrompt(q, sourceName);

  const truth = source ? (H.answers[source.uid] || {})[q.i] : null;
  const box = $('#liveOptions');
  box.innerHTML = '';
  optionsFor(q, n).forEach((o, k) => {
    const b = el('button', { class: 'opt', 'data-token': o.token },
      el('span', { class: 'opt-key' }, 'ABCD'[k]), el('span', {}, o.label));
    b.addEventListener('click', () => answer(o.token, truth, couple, step));
    box.append(b);
  });

  $('#liveVerdict').hidden = true;
  $('#liveTimer').hidden = H.round !== 'final';
  H.phase = 'question'; H.picked = null;
  $('#btnLiveNext').hidden = H.round === 'final';
  $('#btnLiveNext').textContent = 'Passer →';

  const totalQ = H.round === 'final' ? RULES.FINAL_QUESTIONS : g.perRound;
  const nowQ   = H.round === 'final' ? H.final.idx + 1 : H.qIdx + 1;
  $('#liveProgress').textContent = H.round === 'final'
    ? `Question ${nowQ}/${totalQ} · ${H.final.errors} erreur(s)`
    : `Question ${nowQ}/${totalQ} · couple ${H.coupleIdx + 1}/${g.couples.length}`;

  if (!source) {
    $('#liveVerdict').hidden = false;
    $('#liveVerdict').className = 'tv-verdict ko';
    $('#liveVerdict').innerHTML = `Personne sur cette place<small>Question annulée</small>`;
  } else if (truth == null && H.round !== 'final') {
    $('#liveVerdict').hidden = false;
    $('#liveVerdict').className = 'tv-verdict ko';
    $('#liveVerdict').innerHTML = `${sourceName} n'a pas répondu à celle-ci<small>Aucun point en jeu</small>`;
  }
}

function answer(token, truth, couple, step) {
  if (H.phase !== 'question') return;
  H.phase = 'reveal'; H.picked = token;
  const ok = isCorrect(token, truth);

  // Révélation : on marque le choix, la vraie réponse, et on éteint le reste.
  $$('#liveOptions .opt').forEach(b => {
    const t = b.dataset.token;
    b.classList.remove('is-picked', 'is-right', 'is-wrong', 'is-truth', 'is-dim');
    if (t === token) b.classList.add('is-picked');
    if (truth != null && t === truth) {
      b.classList.add('is-truth');
      if (ok) b.classList.add('is-right');
    }
    if (t === token && !ok) b.classList.add('is-wrong');
    if (t !== token && t !== truth) b.classList.add('is-dim');
  });

  const v = $('#liveVerdict');
  v.hidden = false;

  if (H.round === 'final') {
    if (ok) { H.final.correct++; sfx.good(); }
    else    { H.final.errors++;  sfx.bad(); shake($('#liveStageWrap')); }
    v.className = 'tv-verdict ' + (ok ? 'ok' : 'ko');
    v.textContent = ok ? 'Exact !' : 'Raté…';
    $('#liveProgress').textContent =
      `Question ${H.final.idx + 1}/${RULES.FINAL_QUESTIONS} · ${H.final.errors} erreur(s)`;
    persistLive();
    setTimeout(() => nextFinal(), 700);
    return;
  }

  const pts = step.points;
  H.stats.asked++;
  if (ok) {
    H.stats.correct++;
    H.scores[couple.id] = (H.scores[couple.id] || 0) + pts;
    sfx.good(); burst('hearts', 26);
    v.className = 'tv-verdict ok';
    v.innerHTML = `Dans le mille ! <span class="pts">+${pts}</span><small>${couple.name} marque</small>`;
  } else {
    sfx.bad(); shake($('#liveStageWrap'));
    v.className = 'tv-verdict ko';
    v.innerHTML = truth == null
      ? `Aucune réponse enregistrée<small>0 point</small>`
      : `Perdu !<small>Il fallait cocher l'autre case…</small>`;
  }
  renderScores(ok ? couple.id : null);
  $('#btnLiveNext').textContent = 'Suivant →';
  persistLive();
}

$('#btnLiveNext')?.addEventListener('click', () => {
  if (H.round === 'final') return;
  sfx.reveal();
  advance();
});

function advance() {
  const g = H.game;
  H.coupleIdx++;
  if (H.coupleIdx >= g.couples.length) {
    H.coupleIdx = 0; H.qIdx++;
    if (H.qIdx >= g.perRound) {
      H.qIdx = 0; H.round++;
      if (H.round > 3) { startFinal(); return; }
    }
  }
  renderLive();
  persistLive();
}

/* ── Finale chronométrée ──────────────────────────────────────── */
function startFinal() {
  const g = H.game;
  const best = [...g.couples].sort((a, b) => (H.scores[b.id] || 0) - (H.scores[a.id] || 0))[0];
  H.finalist = best;
  H.round = 'final';
  H.final = { idx: 0, correct: 0, errors: 0, left: RULES.FINAL_SECONDS, over: false };
  renderLive();
  persistLive();
  resumeFinalTimer();
}

/** Démarre (ou relance après reprise) le chrono de la finale depuis H.final.left. */
function resumeFinalTimer() {
  if (!H.final || H.final.over) return;
  clearInterval(H.timerId);
  $('#liveTimerNum').textContent = Math.max(0, H.final.left);
  H.timerId = setInterval(() => {
    H.final.left--;
    const t = $('#liveTimer');
    $('#liveTimerNum').textContent = Math.max(0, H.final.left);
    t.classList.toggle('is-hot', H.final.left <= 10);
    if (H.final.left <= 10 && H.final.left > 0) sfx.tick();
    if (H.final.left <= 0) endFinal(false, 'Le temps est écoulé.');
  }, 1000);
}

function nextFinal() {
  if (H.final.over) return;
  if (H.final.errors > RULES.FINAL_MAX_ERRORS) { endFinal(false, `${H.final.errors} erreurs, c'est une de trop.`); return; }
  H.final.idx++;
  if (H.final.idx >= RULES.FINAL_QUESTIONS) { endFinal(true, 'Sept questions, dans les temps.'); return; }
  renderLive();
  persistLive();
}

function endFinal(win, why) {
  if (H.final.over) return;
  H.final.over = true;
  clearInterval(H.timerId);
  // On ne compte que les questions réellement posées : un chrono qui expire à la 3e
  // ne doit pas plomber le ratio de complicité avec 4 questions jamais vues.
  H.stats.asked += H.final.correct + H.final.errors;
  H.stats.correct += H.final.correct;
  showPodium(win, why);
}

/* ══════════════ PODIUM ══════════════ */
function showPodium(finalWin, why) {
  const g = H.game;
  const ranked = [...g.couples].sort((a, b) => (H.scores[b.id] || 0) - (H.scores[a.id] || 0));

  const board = $('#podiumBoard');
  board.innerHTML = '';
  ranked.forEach((c, i) => {
    board.append(el('div', { class: 'podium-row' + (i === 0 ? ' is-first' : '') },
      el('span', { class: 'podium-rank' }, ['🥇','🥈','🥉','🎖️'][i] || '•'),
      el('span', { class: 'podium-name' }, c.name),
      el('span', { class: 'podium-pts' }, String(H.scores[c.id] || 0))));
  });

  if (g.mode === 'duo') {
    const ratio = H.stats.asked ? H.stats.correct / H.stats.asked : 0;
    const r = rankFor(ratio);
    $('#podiumEmoji').textContent = finalWin ? r.emoji : '💔';
    $('#podiumTitle').textContent = r.title;
    $('#podiumLine').innerHTML =
      `${r.line}<br><small>${H.stats.correct}/${H.stats.asked} bonnes réponses · finale ${finalWin ? 'réussie' : 'ratée'} — ${why}</small>`;
  } else {
    $('#podiumEmoji').textContent = finalWin ? '🏆' : '💔';
    $('#podiumTitle').textContent = finalWin ? H.finalist.name : 'Finale perdue';
    $('#podiumLine').innerHTML = finalWin
      ? `${H.finalist.name} rafle la mise après une finale sans faute.<br><small>${why}</small>`
      : `${H.finalist.name} termine en tête au score mais s'effondre en finale.<br><small>${why}</small>`;
  }

  if (finalWin) { sfx.win(); burst('confetti', 140); setTimeout(() => burst('hearts', 50), 400); }
  else { sfx.lose(); }

  patchGame(H.code, { status: 'finished', finalistId: H.finalist?.id || null,
                      finalResult: { win: finalWin, correct: H.final.correct, errors: H.final.errors } })
    .catch(() => {});
  showScreen('screen-podium');
}

$('#btnReplay')?.addEventListener('click', () => {
  showConfirmModal(
    "Nouvelle partie : les joueurs devront répondre à un nouveau questionnaire (les questions déjà jouées sont écartées). On y va ?",
    () => { location.hash = '#/create'; }, { okLabel: 'Nouvelle partie' });
});

$('#btnLiveQuit')?.addEventListener('click', () => {
  showConfirmModal(
    "Quitter le plateau ? Les scores sont sauvegardés : tu pourras reprendre depuis le salon.",
    () => {
      clearInterval(H.timerId);
      persistLive();
      // On est déjà sur #/host/CODE : réécrire le hash ne déclencherait aucun hashchange,
      // donc on rappelle le salon directement.
      enterLobby(H.code);
    },
    { okLabel: 'Quitter' });
});

/* ══════════════ HISTORIQUE ══════════════ */
export function renderHistory() {
  const list = hostGames();
  const box = $('#homeHistoryList');
  $('#homeHistory').hidden = list.length === 0;
  box.innerHTML = '';
  list.forEach(g => {
    const d = new Date(g.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const item = el('button', { class: 'history-item' },
      el('span', {}, el('strong', {}, g.couples.join(' · ')),
        el('small', {}, `${d} · ${g.mode === 'duo' ? 'Duo' : 'Tournoi'} · code ${g.code}`)),
      el('span', { class: 'mono' }, '→'));
    item.addEventListener('click', () => { location.hash = '#/host/' + g.code; });
    box.append(item);
  });
}

function detach() {
  if (H.unsubGame) { H.unsubGame(); H.unsubGame = null; }
  if (H.unsubPlayers) { H.unsubPlayers(); H.unsubPlayers = null; }
}
export function leaveHost() { detach(); clearInterval(H.timerId); }
