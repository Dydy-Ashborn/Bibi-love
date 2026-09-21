/* Bibi Love — parcours hôte : création, salon, plateau, podium.
 * L'hôte est le seul à lire les réponses des joueurs (règles Firestore). */
import { $, $$, el, icon, iconHtml, showScreen, toast, sfx, burst, shake, showConfirmModal, copy, initials } from './util.js';
import { RULES } from './config.js';
import {
  byId, buildPlan, optionsFor, guessPrompt, selfPrompt, isCorrect,
  ROUND_TITLES, roundSubtitle, questionCount, persoUtilisables
} from './game.js';
import { rankFor, podiumLine, pioche, REACT_GOOD, REACT_BAD, REACT_VIDE } from './data/verdicts.js';
import { PHASE, broadcast } from './live.js';
import { guard, isPremium, resume as planResume } from './plan.js';
import { estTonPerso } from './data/questions.js';
import {
  createGame, loadGame, watchGame, watchPlayers, patchGame,
  deleteGame, allAnswers, allCustom, hostGames, watchGuesses, uid
} from './store.js';

/* ══════════════ ÉTAT ══════════════ */
const cfg = { mode: 'duo', pairing: 'mixte', spice: 1, durationMin: 45,
              couples: [{ name: 'Le couple' }] };

const H = {
  code: null, game: null, players: [], answers: {},
  unsubGame: null, unsubPlayers: null,
  plan: null, round: 1, qIdx: 0, coupleIdx: 0, phase: 'question', seq: 0,
  unsubGuesses: null, customs: {}, persoMode: 'off',
  picked: null, scores: {}, stats: { asked: 0, correct: 0 },
  finalist: null, final: null, timerId: null
};

/* ══════════════ CRÉATION ══════════════ */
export function enterCreate() {
  syncCreateUI();
  renderCouplesList();
  showScreen('screen-create');
}

const CHAMP_VERS_LIMITE = { spice: 'spice', durationMin: 'duration' };

$$('.choice-grid[data-field]').forEach(grid => {
  grid.addEventListener('click', e => {
    const btn = e.target.closest('.choice');
    if (!btn || btn.disabled) return;
    const field = grid.dataset.field;
    let v = btn.dataset.value;
    if (field === 'spice' || field === 'durationMin') v = Number(v);

    // Point de contrôle unique : aucune vérification de plan ailleurs.
    const limite = CHAMP_VERS_LIMITE[field];
    if (limite) {
      const verdict = guard(limite, v);
      if (!verdict.ok) { openPaywall(verdict.why); return; }
    }
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
  // L'avertissement 18+ n'apparaît que sur le niveau explicite, qui est cloisonné :
  // il ne se mélange à aucun autre niveau, dans un sens comme dans l'autre.
  $('#adultNote').hidden = cfg.spice !== 4;
  $('#persoNote').hidden = !estTonPerso(cfg.spice);

  // Le format fige le nombre de places dans la partie. Ne pas le dire ici, c'est
  // laisser l'hôte envoyer un lien Duo à quatre amis qui ne pourront jamais rejoindre.
  const note = $('#modeNote');
  note.hidden = false;
  note.innerHTML = cfg.mode === 'duo'
    ? iconHtml('circle-info') + "Le lien n'acceptera que <strong>deux joueurs</strong>. " +
      "Pour inviter d'autres couples, choisis Tournoi."
    : iconHtml('circle-info') + `Le lien ouvrira <strong>${cfg.couples.length} places de couple</strong> ` +
      `(${cfg.couples.length * 2} joueurs). Tu pourras encore en ajouter depuis le salon.`;

  // Cadenas sur les options payantes : elles restent visibles et cliquables — c'est
  // le clic qui ouvre l'offre. Une option grisée ne donne envie de rien.
  $$('.choice-grid[data-field="spice"] .choice').forEach(b =>
    b.classList.toggle('is-locked', !guard('spice', Number(b.dataset.value)).ok));
  $$('.choice-grid[data-field="durationMin"] .choice').forEach(b =>
    b.classList.toggle('is-locked', !guard('duration', Number(b.dataset.value)).ok));

  const r = planResume();
  $('#planBanner').hidden = false;
  $('#planBannerTitle').textContent = r.titre;
  $('#planBannerLine').textContent = ' — ' + r.ligne;
  $('#btnPlanUpgrade').hidden = isPremium();

  const { perRound, total } = questionCount(cfg.durationMin);
  $('#createSummary').textContent =
    `${total} questions à remplir en amont · 3 manches de ${perRound} + une finale de ${RULES.FINAL_QUESTIONS} questions.`;
}

/* ══════════════ PAYWALL ══════════════ */
export function openPaywall(why) {
  $('#paywallWhy').textContent = why || "Débloque tout le jeu, une bonne fois pour toutes.";
  const consent = $('#paywallConsent');
  if (consent) {
    consent.checked = false;
    consent.dispatchEvent(new Event('change'));
  }
  $('#paywall').classList.add('is-open');
  sfx.tap();
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
      const del = el('button', { class: 'couple-del', title: 'Retirer' }, icon('xmark'));
      del.addEventListener('click', () => { cfg.couples.splice(i, 1); renderCouplesList(); syncCreateUI(); });
      row.append(del);
    }
    box.append(row);
  });
}

$('#btnAddCouple')?.addEventListener('click', () => {
  if (cfg.couples.length >= RULES.MAX_COUPLES) return;
  const verdict = guard('couples', cfg.couples.length + 1);
  if (!verdict.ok) { openPaywall(verdict.why); return; }
  cfg.couples.push({ name: 'Couple ' + (cfg.couples.length + 1) });
  renderCouplesList(); syncCreateUI(); sfx.tap();
});

$('#btnCreateGame')?.addEventListener('click', async () => {
  const btn = $('#btnCreateGame');
  const label = 'Générer le lien ' + iconHtml('link');
  btn.disabled = true;
  btn.innerHTML = iconHtml('hourglass-half') + ' Création…';
  try {
    const game = await createGame(cfg);
    H.code = game.code;
    showShare(game.code);
  } catch (e) {
    console.error(e);
    toast("Création impossible. Vérifie les règles Firestore.", 'err');
  } finally {
    btn.disabled = false; btn.innerHTML = label;
  }
});

/* ══════════════ PARTAGE ══════════════ */
function joinUrl(code) {
  return location.origin + location.pathname + '#/j/' + code;
}
/** Message prêt à coller dans une conversation — le lien seul n'explique rien. */
function messagePartage(code) {
  const perso = H.game ? estTonPerso(H.game.spice) : estTonPerso(cfg.spice);
  return perso
    ? "On joue à Bibi Love ! Cette partie se joue avec VOS questions : ouvre ce lien et "
      + "écris celles que ton/ta partenaire devra deviner, avec la réponse que tu attends. "
      + "Pas de questionnaire à remplir.\n" + joinUrl(code)
    : "On joue à Bibi Love ! Avant la soirée, ouvre ce lien : tu réponds à ton "
      + "questionnaire (5 min) et tu peux écrire tes propres questions pour ton/ta "
      + "partenaire. Personne ne verra tes réponses.\n" + joinUrl(code);
}

function showShare(code) {
  $('#shareCode').textContent = code;
  $('#shareLink').textContent = joinUrl(code);
  $('#shareMessage').textContent = messagePartage(code);
  showScreen('screen-share');
  burst('confetti', 60); sfx.win();
}
$('#btnCopyMessage')?.addEventListener('click', async () => {
  const ok = await copy($('#shareMessage').textContent);
  toast(ok ? 'Message copié, plus qu\'à coller.' : 'Copie impossible, sélectionne le texte.', ok ? 'ok' : 'err');
});

$('#btnCopyLink')?.addEventListener('click', async () => {
  const ok = await copy($('#shareLink').textContent);
  toast(ok ? 'Lien copié' : 'Copie impossible, sélectionne le lien.', ok ? 'ok' : 'err');
});
$('#btnShareLink')?.addEventListener('click', async () => {
  const url = $('#shareLink').textContent;
  if (navigator.share) { try { await navigator.share({ title: 'Bibi Love', text: messagePartage(H.code), url }); } catch {} }
  else { const ok = await copy(url); toast(ok ? 'Lien copié' : 'Copie impossible.', ok ? 'ok' : 'err'); }
});
$('#btnGoLobby')?.addEventListener('click', () => { location.hash = '#/host/' + H.code; });
$('#btnLobbyShare')?.addEventListener('click', async () => {
  const ok = await copy(messagePartage(H.code));
  toast(ok ? 'Lien copié' : joinUrl(H.code), ok ? 'ok' : 'info');
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

  // Le mode détermine CE QU'ON COMPTE : en ton perso il n'y a aucun questionnaire,
  // afficher « 0/22 réponses » annonce une tâche qui n'existe pas et fait croire que
  // rien n'a été enregistré alors que les questions sont bien là.
  const tonPerso = estTonPerso(g.spice);

  g.couples.forEach(c => {
    const { A, B } = coupleOf(c);
    const slots = el('div', { class: 'lobby-slots' });
    [['A', A], ['B', B]].forEach(([slot, p]) => {
      if (!p) {
        slots.append(el('div', { class: 'slot is-empty' },
          el('div', { class: 'avatar' }, icon('user')),
          el('div', {}, el('div', { class: 'slot-name' }, 'En attente'),
                        el('div', { class: 'slot-state' }, 'Place ' + slot))));
        return;
      }
      const ecrit = p.customCount || 0;
      const done = tonPerso ? ecrit > 0 : (p.answered || 0) >= total;
      if (done) ready++;
      const etat = tonPerso
        ? (ecrit ? iconHtml('circle-check') + ` ${ecrit} question${ecrit > 1 ? 's' : ''}`
                 : 'Aucune question écrite')
        : (done ? iconHtml('circle-check') + ' Prêt'
                : `${p.answered || 0}/${total} réponses`);
      // Cliquable : l'hôte est le seul à pouvoir lire les réponses (règles Firestore),
      // c'est donc le seul endroit où vérifier qu'un joueur a bien rempli — et quoi.
      const carte = el('button', { class: 'slot' + (done ? ' is-done' : ''), type: 'button',
                                   title: 'Voir ce que ' + p.name + ' a rempli' },
        el('div', { class: 'avatar' }, initials(p.name)),
        el('div', { class: 'slot-txt' }, el('div', { class: 'slot-name' }, p.name),
          el('div', { class: 'slot-state', html: etat })),
        el('span', { class: 'slot-peek' }, 'Voir'));
      carte.addEventListener('click', () => ouvrirFiche(p, c));
      slots.append(carte);
    });
    box.append(el('div', { class: 'lobby-couple' },
      el('h3', {}, c.name),
      el('p', { class: 'lobby-hint' }, 'Touche un prénom pour voir ses réponses'),
      slots));
  });

  // Le repli étant décidé couple par couple (voir `resoudreQuestion`), on compte les
  // couples prêts plutôt qu'un minimum global : un couple qui n'a rien écrit ne doit
  // pas priver les autres de leurs questions.
  const ecrites = H.players.reduce((n, p) => n + (p.customCount || 0), 0);
  const prets = g.couples.filter(c => {
    const { A, B } = coupleOf(c);
    return (A && A.customCount) && (B && B.customCount);
  }).length;
  const maxEcrites = Math.max(0, ...H.players.map(p => p.customCount || 0));
  const utilisables = persoUtilisables(g.perRound, maxEcrites);

  // En ton « Questions perso », il n'y a rien à choisir : la partie EST la partie perso.
  // Le sélecteur disparaît, sinon l'hôte croit pouvoir revenir en arrière alors que
  // personne n'a rempli de questionnaire.
  $('.choice-grid[data-field="persoMode"]').hidden = tonPerso;
  if (tonPerso) H.persoMode = 'mix';

  const btnMix = $('.choice-grid[data-field="persoMode"] .choice[data-value="mix"]');
  if (btnMix) btnMix.disabled = prets === 0;
  if (!tonPerso && prets === 0 && H.persoMode === 'mix') {
    H.persoMode = 'off';
    $$('.choice-grid[data-field="persoMode"] .choice').forEach(b =>
      b.classList.toggle('is-on', b.dataset.value === 'off'));
  }
  $('#persoSummary').innerHTML = tonPerso
    ? (prets === 0
        ? `<strong>Partie 100 % questions perso.</strong> ${ecrites} écrite(s), mais il en faut des <strong>deux côtés</strong> dans un couple. Sans ça, leurs tours seront sautés.`
        : `<strong>Partie 100 % questions perso</strong> · ${prets}/${g.couples.length} couple(s) prêt(s) · ${ecrites} question(s) écrite(s).`)
    : ecrites === 0
      ? "Personne n'a encore écrit de question. Le lien le leur propose à côté du questionnaire."
      : prets === 0
        ? `<strong>${ecrites}</strong> question(s) écrite(s), mais dans aucun couple les <strong>deux</strong> membres n'en ont écrit. Il en faut des deux côtés.`
        : `<strong>${prets}/${g.couples.length}</strong> couple(s) prêt(s) · <strong>${ecrites}</strong> question(s) écrite(s). ` +
          `Jusqu'à <strong>${utilisables} par personne</strong> en manches 1 et 2 ; les couples qui n'en ont pas écrit reçoivent des questions Bibi Love.`;

  const btnAdd = $('#btnLobbyAddCouple');
  btnAdd.hidden = g.status !== 'lobby' || g.couples.length >= RULES.MAX_COUPLES;

  const resumable = canResume(g);
  $('#lobbyStatus').innerHTML = resumable
    ? `Partie en cours — <strong>${resumeLabel(g)}</strong>. Les scores ont été sauvegardés, tu reprends exactement où tu t'es arrêté.`
    : tonPerso
      ? `<strong>${ready}/${expected}</strong> joueurs ont écrit leurs questions. Aucun questionnaire à remplir dans ce mode.`
      : `<strong>${ready}/${expected}</strong> joueurs prêts. Tu peux lancer dès que tout le monde a fini — ` +
        `les réponses manquantes compteront comme fausses.`;
  const btn = $('#btnStartLive');
  btn.innerHTML = resumable ? iconHtml('play') + ' Reprendre la partie'
                : g.status === 'finished' ? iconHtml('rotate-right') + ' Relancer une partie'
                : iconHtml('clapperboard') + ' Lancer la partie';
  btn.disabled = H.players.length < 2;
  // Partie en cours : en plus de « Reprendre », on peut repartir de zéro ou l'arrêter
  // (classement sur les scores actuels). Sans ça, la seule sortie était de supprimer.
  $('#lobbyLiveActions').hidden = !resumable;
}

/* ── Fiche joueur : ce qu'il a rempli ─────────────────────────────────────
 * L'hôte est le seul lecteur autorisé des réponses (firestore.rules) : sans cet
 * écran, un « 12/22 » au salon ne dit ni lesquelles manquent ni ce qui a été
 * répondu. Lecture à la demande, jamais en écoute permanente : ouvrir la fiche
 * d'un joueur ne doit pas coûter une lecture Firestore à chaque frappe des autres.
 */
async function ouvrirFiche(p, couple) {
  const g = H.game; if (!g) return;
  const modal = $('#peekModal');
  const body = $('#peekBody');
  const tonPerso = estTonPerso(g.spice);

  $('#peekTitle').textContent = p.name;
  $('#peekSub').textContent = couple ? couple.name : '';
  body.innerHTML = '';
  body.append(el('p', { class: 'peek-empty' }, 'Chargement…'));
  modal.classList.add('is-open');

  const mate = H.players.find(o => o.coupleId === p.coupleId && o.uid !== p.uid) || null;

  let items;
  try {
    items = tonPerso || H.persoMode === 'mix'
      ? await ficheCustom(p, mate)
      : null;
    if (!tonPerso) {
      const rep = await ficheReponses(p, mate);
      items = items ? items.concat(rep) : rep;
    }
  } catch (e) {
    body.innerHTML = '';
    body.append(el('p', { class: 'peek-empty' },
      "Impossible de lire les réponses. Les règles Firestore sont-elles déployées ?"));
    return;
  }

  body.innerHTML = '';
  if (!items.length) {
    body.append(el('p', { class: 'peek-empty' },
      p.name + " n'a encore rien rempli. Le lien de la partie lui propose le questionnaire."));
    return;
  }
  const remplies = items.filter(it => it.a).length;
  $('#peekSub').textContent =
    (couple ? couple.name + ' · ' : '') + remplies + '/' + items.length + ' rempli(e)s';

  items.forEach((it, n) => {
    body.append(el('div', { class: 'peek-item' + (it.a ? '' : ' is-void') },
      el('div', { class: 'peek-q' }, it.q),
      el('div', { class: 'peek-a' },
        el('span', { class: 'peek-n' }, String(n + 1)),
        el('span', {}, it.a || 'Pas encore répondu'))));
  });
}

/** Questions écrites par le joueur pour son/sa partenaire. */
async function ficheCustom(p, mate) {
  const map = await allCustom(H.code, [p]);
  const pour = mate ? ' (pour ' + mate.name + ')' : '';
  return (map[p.uid] || []).map(it => ({
    q: (it.q || '') + pour,
    a: it.a || ''
  }));
}

/** Réponses du joueur au questionnaire tiré pour la partie. */
async function ficheReponses(p, mate) {
  const g = H.game;
  const map = await allAnswers(H.code, [p]);
  const mes = map[p.uid] || {};
  const nom = { nameA: p.slot === 'A' ? p.name : (mate && mate.name),
                nameB: p.slot === 'B' ? p.name : (mate && mate.name) };
  return g.questionIds.map(qid => {
    const q = byId(qid);
    if (!q) return null;
    const token = mes[qid];
    const opt = optionsFor(q, nom, p.gender).find(o => o.token === token);
    return {
      q: selfPrompt(q, p.gender, mate && mate.gender),
      a: opt ? opt.label : ''
    };
  }).filter(Boolean);
}

/** Une partie est reprenable si elle a été lancée et n'est pas terminée. */
function canResume(g) {
  return g && g.status === 'live' && g.live && g.live.phase && g.live.phase !== 'idle';
}

function resumeLabel(g) {
  const L = g.live;
  if (L.round === 'final') return `finale, question ${(L.final?.idx || 0) + 1}/${RULES.FINAL_QUESTIONS}`;
  // En ton perso la longueur des manches dépend de ce qui a été écrit : elle n'est
  // connue qu'une fois le plan chargé, on n'affiche donc pas de total ici.
  return estTonPerso(g.spice)
    ? `manche ${L.round}, question ${(L.qIdx || 0) + 1}`
    : `manche ${L.round}, question ${(L.qIdx || 0) + 1}/${g.perRound}`;
}

$('.choice-grid[data-field="persoMode"]')?.addEventListener('click', e => {
  const btn = e.target.closest('.choice');
  if (!btn || btn.disabled) return;
  H.persoMode = btn.dataset.value;
  $$('.choice-grid[data-field="persoMode"] .choice').forEach(b => b.classList.toggle('is-on', b === btn));
  sfx.tap();
  renderLobby();
});

$('#btnStartLive')?.addEventListener('click', () => {
  if (canResume(H.game)) { startLive(true); return; }

  const total = H.game.questionIds.length;
  const go = () => startLive(false);
  const late = estTonPerso(H.game.spice)
    ? H.players.filter(p => !(p.customCount > 0)).map(p => p.name)
    : H.players.filter(p => (p.answered || 0) < total).map(p => p.name);

  if (H.game.status === 'finished') {
    showConfirmModal(
      "Cette partie est terminée. La relancer remet tous les scores à zéro sur les mêmes questions. On y va ?",
      go, { okLabel: 'Relancer' });
    return;
  }
  if (late.length) {
    showConfirmModal(
      estTonPerso(H.game.spice)
        ? `${late.join(', ')} n'${late.length > 1 ? 'ont' : 'a'} écrit aucune question. Leurs tours seront sautés. On lance quand même ?`
        : `${late.join(', ')} n'${late.length > 1 ? 'ont' : 'a'} pas terminé. Leurs questions sans réponse seront perdues. On lance quand même ?`,
      go, { okLabel: 'Lancer la partie' });
  } else go();
});

/**
 * Ajoute une place de couple à une partie DÉJÀ créée.
 * Sans ça, un hôte qui a sous-estimé le nombre d'invités doit tout recréer et
 * renvoyer un nouveau lien — en perdant les questionnaires déjà remplis.
 */
$('#btnLobbyAddCouple')?.addEventListener('click', async () => {
  const g = H.game;
  if (!g || g.couples.length >= RULES.MAX_COUPLES) return;
  const verdict = guard('couples', g.couples.length + 1);
  if (!verdict.ok) { openPaywall(verdict.why); return; }

  const couples = g.couples.concat([{
    id: 'c' + (g.couples.length + 1),
    name: 'Couple ' + (g.couples.length + 1),
    score: 0, nameA: '', nameB: ''
  }]);
  try {
    await patchGame(H.code, { couples, mode: 'tournoi' });
    sfx.good();
    toast('Une place de couple ajoutée. Le lien reste le même.', 'ok');
  } catch { toast("Ajout impossible, vérifie ta connexion.", 'err'); }
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

  if (resume && canResume(g)) {
    const L = g.live;
    H.round     = L.round;
    H.qIdx      = L.qIdx || 0;
    H.coupleIdx = L.coupleIdx || 0;
    H.scores    = Object.assign({}, L.scores);
    H.stats     = Object.assign({ asked: 0, correct: 0 }, L.stats);
    H.persoMode = L.persoMode || 'off';
    H.finalist  = L.finalistId ? g.couples.find(c => c.id === L.finalistId) || null : null;
    H.final     = L.final ? Object.assign({}, L.final) : null;
    g.couples.forEach(c => { if (H.scores[c.id] == null) H.scores[c.id] = 0; });
    await chargerPlan(g);
    H.phase = 'question'; H.picked = null;
    ecouteManettes();
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

  await chargerPlan(g);
  H.round = 1; H.qIdx = 0; H.coupleIdx = 0; H.phase = 'question'; H.picked = null;
  H.stats = { asked: 0, correct: 0 };
  H.finalist = null; H.final = null;
  H.scores = {}; g.couples.forEach(c => { H.scores[c.id] = 0; });
  await patchGame(H.code, { status: 'live', finalResult: null, finalistId: null }).catch(() => {});
  ecouteManettes();
  showScreen('screen-live');
  renderLive();
  persistLive();
}

/** Branche l'écoute des choix envoyés depuis les téléphones (une seule fois). */
function ecouteManettes() {
  if (H.unsubGuesses) return;
  H.unsubGuesses = watchGuesses(H.code, onGuesses);
}

/**
 * Charge les questions perso si le mode est actif, puis construit le plan.
 * `perso` est le maximum écrit par un auteur, pas le minimum : les couples qui en ont
 * écrit moins retombent sur la question Bibi Love d'origine, question par question
 * (voir `resoudreQuestion`). Prendre le minimum priverait tout le monde dès qu'une
 * seule personne n'a rien écrit.
 */
async function chargerPlan(g) {
  const tonPerso = estTonPerso(g.spice);
  if (tonPerso) H.persoMode = 'mix';
  H.customs = H.persoMode === 'mix' ? await allCustom(H.code, H.players) : {};
  const perso = H.persoMode === 'mix'
    ? Math.max(0, ...Object.values(H.customs).map(l => l.length))
    : 0;
  // Ton perso : la taille de la partie vient de ce qui a été écrit, place par place
  // (le plus grand nombre de questions en A et en B, tous couples confondus). Le plan
  // est recalculé à l'identique à chaque reprise : les `n` restent stables.
  const compte = { A: 0, B: 0 };
  if (tonPerso) {
    H.players.forEach(p => {
      if (p.slot !== 'A' && p.slot !== 'B') return;
      compte[p.slot] = Math.max(compte[p.slot], (H.customs[p.uid] || []).length);
    });
  }
  H.plan = buildPlan(g.questionIds, g.perRound, { perso, toutPerso: tonPerso, compte });
}

/** Nombre d'étapes de la manche en cours — fixe en jeu classique, variable en ton perso. */
function tailleManche() {
  const r = H.plan && H.plan.rounds[H.round - 1];
  return r ? r.length : H.game.perRound;
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
      persoMode: H.persoMode,
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
  return {
    nameA: A ? A.name : 'Joueur A', nameB: B ? B.name : 'Joueur B',
    genderA: A ? (A.gender || 'n') : 'n', genderB: B ? (B.gender || 'n') : 'n',
    A, B
  };
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

/**
 * Résout la question réellement posée pour un couple donné.
 * Une étape marquée `custom` pioche dans les questions écrites par l'auteur du couple ;
 * s'il n'en a pas écrit assez, on retombe sur la question Bibi Love d'origine restée
 * dans `step.qid`. C'est ce repli qui permet de lancer le mode perso même quand un
 * seul couple sur trois a joué le jeu.
 */
function resoudreQuestion(step, source) {
  if (step.custom && source) {
    const it = (H.customs[source.uid] || [])[step.n];
    if (it && it.q && it.a) {
      return {
        perso: true, kind: 'texte',
        q: { i: `x-${source.uid}-${step.n}`, k: 'perso', t: 'perso', s: 0, q: it.q },
        expected: it.a, truth: null
      };
    }
  }
  const q = byId(step.qid);
  return {
    perso: false, kind: 'qcm', q, expected: null,
    truth: source ? (H.answers[source.uid] || {})[q.i] : null
  };
}

/** Vrai si l'auteur de cette étape, dans ce couple, a une question perso à ce rang. */
function aQuestionPerso(step, couple) {
  if (!step || !step.custom || !couple) return false;
  const n = names(couple);
  const auteur = step.source === 'A' ? n.A : n.B;
  const it = auteur ? (H.customs[auteur.uid] || [])[step.n] : null;
  return !!(it && it.q && it.a);
}

/**
 * Ton perso : étape sans question écrite pour ce couple. En manche on passe au tour
 * suivant ; en finale on cherche la prochaine question du finaliste, et s'il n'en a
 * plus, la finale s'arrête sur ce qui a été joué plutôt que sur des questions vides.
 */
function sauterEtape() {
  if (H.round !== 'final') { advance(); return; }
  const reste = H.plan.final.slice(H.final.idx + 1).some(st => aQuestionPerso(st, H.finalist));
  if (!reste) {
    // Plus rien à poser : le finaliste n'a pas échoué, il ne peut pas « perdre » une
    // finale faute de questions — il gagne sur ce qui a été joué.
    const joue = H.final.correct + H.final.errors;
    endFinal(H.final.errors <= RULES.FINAL_MAX_ERRORS,
      joue ? 'Toutes les questions perso ont été posées.'
           : 'Pas de finale : toutes les questions perso ont déjà été jouées.');
    return;
  }
  H.final.idx++;
  renderLive();
}

function renderLive() {
  const g = H.game;
  const couple = currentCouple();
  const n = names(couple);
  const step = currentStep();

  $('#liveRoundTitle').textContent = ROUND_TITLES[H.round];
  $('#liveRoundSub').textContent = roundSubtitle(H.round, g.pairing, n);
  renderScores();

  const source  = step.source === 'A' ? n.A : n.B;
  const guesser = step.source === 'A' ? n.B : n.A;
  const sourceName  = source  ? source.name  : (step.source === 'A' ? n.nameA : n.nameB);
  const guesserName = guesser ? guesser.name : (step.source === 'A' ? n.nameB : n.nameA);
  const sourceGender = step.source === 'A' ? n.genderA : n.genderB;

  const { q, truth, perso, kind, expected } = resoudreQuestion(step, source);
  const texte = kind === 'texte';

  // Ton perso : jamais de QCM de la banque — personne n'a rempli de questionnaire dans
  // ce mode, la question serait morte (« X n'a rien rempli »). On saute l'étape.
  if (estTonPerso(g.spice) && !perso) { sauterEtape(); return; }

  $('#liveTurn').innerHTML = H.round === 'final'
    ? `<b>${guesserName}</b>, réponds vite : qu'a mis <b>${sourceName}</b> ?`
    : perso
      ? `${iconHtml('wand-magic-sparkles')} <b>Question de ${sourceName}</b> — à <b>${guesserName}</b> de répondre`
      : `<b>${couple.name}</b> — <b>${guesserName}</b> devine ce qu'a répondu <b>${sourceName}</b>`;

  const prompt = perso ? q.q : guessPrompt(q, sourceName, sourceGender);
  $('#liveQuestion').textContent = prompt;
  $('#liveQuestion').classList.toggle('is-perso', !!perso);

  const opts = texte ? [] : optionsFor(q, n, sourceGender);
  const box = $('#liveOptions');
  box.innerHTML = '';
  box.hidden = texte;
  opts.forEach((o, k) => {
    const b = el('button', { class: 'opt', 'data-token': o.token },
      el('span', { class: 'opt-key' }, 'ABCD'[k]), el('span', {}, o.label));
    b.addEventListener('click', () => answer(o.token, truth, couple, step));
    box.append(b);
  });

  // Réponse libre : la réponse attendue reste cachée jusqu'au dévoilement, sinon
  // toute la salle la lit sur l'écran avant que le joueur n'ait ouvert la bouche.
  $('#liveTexte').hidden = !texte;
  $('#liveTexte').classList.remove('is-ok', 'is-ko');
  if (texte) {
    $('#liveTexteWho').textContent = `Réponse de ${guesserName}`;
    $('#liveTexteAuthor').textContent = `Ce qu'attendait ${sourceName}`;
    $('#liveTexteGiven').textContent = 'En attente…';
    $('#liveTexteGiven').classList.add('is-waiting');
    $('#liveTexteExpectedRow').hidden = true;
    $('#liveTexteExpected').textContent = expected || '';
    $('#btnReveal').hidden = false;
    $('#btnJugeOk').hidden = true;
    $('#btnJugeKo').hidden = true;
  }

  $('#liveVerdict').hidden = true;
  $('#liveTimer').hidden = H.round !== 'final';
  H.phase = 'question'; H.picked = null;
  H.step = { truth, couple, step, kind, expected, sourceName, guesserName, opts };
  $('#btnLiveNext').hidden = H.round === 'final' || texte;
  $('#btnCorriger').hidden = true;
  H.verdict = null;
  $('#btnLiveNext').innerHTML = 'Passer ' + iconHtml('arrow-right');

  const totalQ = H.round === 'final' ? RULES.FINAL_QUESTIONS : tailleManche();
  const nowQ   = H.round === 'final' ? H.final.idx + 1 : H.qIdx + 1;
  $('#liveProgress').textContent = H.round === 'final'
    ? `Question ${nowQ}/${totalQ} · ${H.final.errors} erreur(s)`
    : `Question ${nowQ}/${totalQ} · couple ${H.coupleIdx + 1}/${g.couples.length}`;

  // Cas dégradés : place vide, ou joueur qui n'avait pas rempli son questionnaire.
  if (!source) {
    $('#liveVerdict').hidden = false;
    $('#liveVerdict').className = 'tv-verdict ko';
    $('#liveVerdict').innerHTML = `Personne sur cette place<small>Question annulée</small>`;
  } else if (!texte && truth == null && H.round !== 'final') {
    // Le cas « rien rempli » ne concerne que les questions de la banque : sur une
    // question perso, l'absence de `truth` est normale — la réponse attendue est du
    // texte libre et c'est l'hôte qui tranche.
    $('#liveVerdict').hidden = false;
    $('#liveVerdict').className = 'tv-verdict ko';
    $('#liveVerdict').innerHTML =
      `${sourceName} n'a rien rempli<small>${pioche(REACT_VIDE, 'vide')}</small>`;
  }

  // Diffusion vers les téléphones : nouvelle question = nouveau `seq`.
  H.seq++;
  publish(broadcast({
    seq: H.seq, phase: PHASE.QUESTION, kind, perso, round: H.round, qid: q.i,
    coupleId: couple.id, coupleName: couple.name,
    sourceUid: source ? source.uid : null, sourceName,
    guesserUid: guesser ? guesser.uid : null, guesserName,
    sourceGender, prompt, options: opts, scores: H.scores
  }));
}

/**
 * Publie l'état courant vers les téléphones.
 * Champ `bc` à la racine du doc, et surtout PAS sous `live` : `persistLive()` réécrit
 * l'objet `live` en entier à chaque transition et effacerait la diffusion publiée
 * juste avant — les téléphones resteraient bloqués sur la question précédente.
 */
function publish(bc) {
  H.bc = bc;
  patchGame(H.code, { bc }).catch(() => { /* la partie continue sans manette */ });
}

/**
 * Choix reçu depuis le téléphone du devineur.
 * Un choix dont le `seq` ne correspond plus à la question affichée est ignoré :
 * sinon un double tap ou un téléphone en retard ferait marquer des points sur
 * la question suivante.
 */
function onGuesses(list) {
  if (H.phase !== 'question' || !H.bc || !H.step) return;
  const attendu = H.bc.guesserUid;
  if (!attendu) return;
  const g = list.find(x => x.uid === attendu && x.seq === H.seq);
  if (!g) return;

  if (H.step.kind === 'texte') {
    if (!g.text) return;
    H.step.given = g.text;
    const box = $('#liveTexteGiven');
    box.textContent = g.text;
    box.classList.remove('is-waiting');
    sfx.reveal();
    return;                     // en réponse libre, c'est l'hôte qui tranche
  }
  if (g.token) answer(g.token, H.step.truth, H.step.couple, H.step.step);
}

/* ══════════════ RÉPONSE LIBRE : DÉVOILEMENT ET ARBITRAGE ══════════════ */

$('#btnReveal')?.addEventListener('click', () => {
  if (!H.step || H.step.kind !== 'texte') return;
  $('#liveTexteExpectedRow').hidden = false;
  $('#btnReveal').hidden = true;
  $('#btnJugeOk').hidden = false;
  $('#btnJugeKo').hidden = false;
  sfx.reveal();
  // La réponse attendue part vers les téléphones à l'instant exact où elle apparaît
  // sur l'écran partagé — jamais avant, le doc de partie étant lisible par tous.
  publish(Object.assign({}, H.bc, {
    expected: H.step.expected || null,
    given: H.step.given || null,
    at: Date.now()
  }));
});

$('#btnJugeOk')?.addEventListener('click', () => jugerTexte(true));
$('#btnJugeKo')?.addEventListener('click', () => jugerTexte(false));

/** L'hôte tranche : la réponse donnée colle-t-elle à ce qu'attendait l'auteur ? */
function jugerTexte(ok) {
  if (H.phase !== 'question' || !H.step || H.step.kind !== 'texte') return;
  const { couple, step } = H.step;
  H.phase = 'reveal';
  $('#btnJugeOk').hidden = true;
  $('#btnJugeKo').hidden = true;
  $('#liveTexteExpectedRow').hidden = false;
  $('#liveTexte').classList.toggle('is-ok', ok);
  $('#liveTexte').classList.toggle('is-ko', !ok);
  appliquerVerdict(ok, couple, step, {
    given: H.step.given || null, expected: H.step.expected || null
  });
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

  const libelle = tok => {
    const o = (H.step && H.step.opts || []).find(x => x.token === tok);
    return o ? o.label : null;
  };
  appliquerVerdict(ok, couple, step, {
    picked: token, truth: truth ?? null,
    pickedLabel: libelle(token), truthLabel: truth != null ? libelle(truth) : null
  });
}

/**
 * Score, punchline, diffusion : tronc commun à la QCM et à la réponse libre arbitrée.
 * `extra` porte ce que les téléphones doivent afficher à la révélation.
 */
function appliquerVerdict(ok, couple, step, extra = {}) {
  const v = $('#liveVerdict');
  v.hidden = false;
  const punch = pioche(ok ? REACT_GOOD : REACT_BAD, ok ? 'good' : 'bad');
  const pts = H.round === 'final' ? 0 : step.points;

  if (H.round === 'final') {
    if (ok) { H.final.correct++; sfx.good(); }
    else    { H.final.errors++;  sfx.bad(); shake($('#liveStageWrap')); }
    v.className = 'tv-verdict ' + (ok ? 'ok' : 'ko');
    v.innerHTML = (ok ? 'Exact !' : 'Raté…') + `<small>${punch}</small>`;
    $('#liveProgress').textContent =
      `Question ${H.final.idx + 1}/${RULES.FINAL_QUESTIONS} · ${H.final.errors} erreur(s)`;
    publishReveal(ok, 0, extra);
    persistLive();
    setTimeout(() => nextFinal(), 900);
    return;
  }

  H.stats.asked++;
  if (ok) {
    H.stats.correct++;
    H.scores[couple.id] = (H.scores[couple.id] || 0) + pts;
    sfx.good(); burst('hearts', 26);
  } else {
    sfx.bad(); shake($('#liveStageWrap'));
  }
  // Mémorisé pour une correction éventuelle (mauvais clic de l'animateur) : tant qu'on
  // n'est pas passé à la question suivante, le verdict peut être retourné.
  H.verdict = { ok, coupleId: couple.id, pts, extra };
  afficherVerdict(ok, pts, punch, extra);
  renderScores(ok ? couple.id : null);
  $('#btnLiveNext').hidden = false;
  $('#btnLiveNext').innerHTML = 'Suivant ' + iconHtml('arrow-right');
  publishReveal(ok, ok ? pts : 0, extra);
  persistLive();
}

/** Bandeau de verdict + bouton de correction — commun au verdict initial et corrigé. */
function afficherVerdict(ok, pts, punch, extra = {}) {
  const v = $('#liveVerdict');
  v.hidden = false;
  v.className = 'tv-verdict ' + (ok ? 'ok' : 'ko');
  v.innerHTML = ok
    ? `Dans le mille ! <span class="pts">+${pts}</span><small>${punch}</small>`
    : (extra.truth == null && extra.expected == null)
      ? `Aucune réponse enregistrée<small>${pioche(REACT_VIDE, 'vide')}</small>`
      : `Perdu !<small>${punch}</small>`;
  $('#liveTexte').classList.toggle('is-ok', ok);
  $('#liveTexte').classList.toggle('is-ko', !ok);
  const c = $('#btnCorriger');
  c.hidden = false;
  c.innerHTML = iconHtml('rotate-right') + (ok ? ' Erreur : compter faux' : ' Erreur : compter juste');
}

/**
 * Retourne le dernier verdict des manches (mauvais clic de l'animateur).
 * Score, stats, affichage et téléphones sont corrigés ensemble ; la correction est
 * sauvegardée comme n'importe quelle transition. Pas en finale : elle enchaîne toute
 * seule sous chrono, il n'y a pas de moment où revenir en arrière.
 */
function corrigerVerdict() {
  const d = H.verdict;
  if (!d || H.round === 'final' || H.phase !== 'reveal') return;
  const ok = !d.ok;
  H.scores[d.coupleId] = (H.scores[d.coupleId] || 0) + (ok ? d.pts : -d.pts);
  H.stats.correct = Math.max(0, H.stats.correct + (ok ? 1 : -1));
  d.ok = ok;
  const punch = pioche(ok ? REACT_GOOD : REACT_BAD, ok ? 'good' : 'bad');
  if (ok) { sfx.good(); burst('hearts', 18); } else { sfx.bad(); }
  afficherVerdict(ok, d.pts, punch, d.extra);
  renderScores(ok ? d.coupleId : null);
  publishReveal(ok, ok ? d.pts : 0, d.extra);
  persistLive();
}

$('#btnCorriger')?.addEventListener('click', corrigerVerdict);

/** Diffuse le résultat aux téléphones pour qu'ils jouent la même animation. */
function publishReveal(ok, pts, extra = {}) {
  if (!H.bc) return;
  publish(Object.assign({}, H.bc, {
    phase: PHASE.REVEAL, correct: !!ok, points: pts,
    picked: extra.picked ?? null, truth: extra.truth ?? null,
    pickedLabel: extra.pickedLabel ?? null, truthLabel: extra.truthLabel ?? null,
    given: extra.given ?? null, expected: extra.expected ?? null,
    scores: H.scores, at: Date.now()
  }));
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
    if (H.qIdx >= tailleManche()) {
      H.qIdx = 0; H.round++;
      if (H.round > 3) {
        if (H.plan.sansFinale) { finirSansFinale(); return; }
        startFinal(); return;
      }
    }
  }
  renderLive();
  persistLive();
}

/**
 * Ton perso : la partie s'arrête après la manche bonus, toutes les questions écrites
 * ayant été jouées. Le couple en tête est sacré sans finale.
 */
function finirSansFinale() {
  const g = H.game;
  H.finalist = [...g.couples].sort((a, b) => (H.scores[b.id] || 0) - (H.scores[a.id] || 0))[0];
  H.round = 'final';
  H.final = { idx: 0, correct: 0, errors: 0, left: 0, over: false };
  persistLive();
  endFinal(true, 'Toutes vos questions ont été jouées.', { mention: 'partie perso complète' });
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

function endFinal(win, why, opts = {}) {
  if (H.final.over) return;
  H.final.over = true;
  clearInterval(H.timerId);
  // On ne compte que les questions réellement posées : un chrono qui expire à la 3e
  // ne doit pas plomber le ratio de complicité avec 4 questions jamais vues.
  H.stats.asked += H.final.correct + H.final.errors;
  H.stats.correct += H.final.correct;
  showPodium(win, why, opts);
}

/* ══════════════ PODIUM ══════════════ */
function showPodium(finalWin, why, opts = {}) {
  const g = H.game;
  const ranked = [...g.couples].sort((a, b) => (H.scores[b.id] || 0) - (H.scores[a.id] || 0));

  const RANK_ICONS = ['trophy', 'medal', 'award', 'star'];
  const board = $('#podiumBoard');
  board.innerHTML = '';
  ranked.forEach((c, i) => {
    board.append(el('div', { class: 'podium-row' + (i === 0 ? ' is-first' : '') + (i === ranked.length - 1 && ranked.length > 1 ? ' is-last' : '') },
      el('span', { class: 'podium-rank' }, icon(RANK_ICONS[i] || 'star')),
      el('span', {},
        el('div', { class: 'podium-name' }, c.name),
        el('div', { class: 'podium-roast' }, podiumLine(i, ranked.length))),
      el('span', { class: 'podium-pts' }, String(H.scores[c.id] || 0))));
  });

  if (g.mode === 'duo') {
    const ratio = H.stats.asked ? H.stats.correct / H.stats.asked : 0;
    const r = rankFor(ratio);
    $('#podiumEmoji').innerHTML = iconHtml(finalWin ? r.icon : 'heart-crack');
    $('#podiumTitle').textContent = r.title;
    $('#podiumLine').innerHTML =
      `${r.line}<br><small>${H.stats.correct}/${H.stats.asked} bonnes réponses · ${opts.mention || ('finale ' + (finalWin ? 'réussie' : 'ratée'))} — ${why}</small>`;
  } else {
    $('#podiumEmoji').innerHTML = iconHtml(finalWin ? 'trophy' : 'heart-crack');
    $('#podiumTitle').textContent = finalWin ? H.finalist.name : 'Finale perdue';
    $('#podiumLine').innerHTML = finalWin
      ? `${podiumLine(0, ranked.length)}<br><small>${why}</small>`
      : `${H.finalist.name} termine en tête au score et s'effondre en finale. Le pire scénario.<br><small>${why}</small>`;
  }

  if (finalWin) { sfx.win(); burst('confetti', 140); setTimeout(() => burst('hearts', 50), 400); }
  else { sfx.lose(); }

  // Diffusion du classement : chaque téléphone affiche son propre commentaire.
  publish(broadcast({
    seq: ++H.seq, phase: PHASE.FINI, scores: H.scores,
    coupleId: H.finalist ? H.finalist.id : null,
    coupleName: H.finalist ? H.finalist.name : null,
    correct: finalWin
  }));

  patchGame(H.code, { status: 'finished', finalistId: H.finalist?.id || null,
                      finalResult: { win: finalWin, correct: H.final?.correct || 0, errors: H.final?.errors || 0,
                                     arretee: !!opts.arretee } })
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

/* ══════════════ BOUTONS DU PAYWALL ══════════════ */
$('#btnPlanUpgrade')?.addEventListener('click', () => openPaywall());
$('#paywallCancel')?.addEventListener('click', () => $('#paywall').classList.remove('is-open'));
$('#paywall')?.addEventListener('click', e => {
  if (e.target === $('#paywall')) $('#paywall').classList.remove('is-open');
});

/* ══════════════ PARTIE EN COURS : RECOMMENCER / ARRÊTER ══════════════ */

$('#btnRestartGame')?.addEventListener('click', () => {
  showConfirmModal(
    "Recommencer à zéro ? Les scores repartent de 0, avec les mêmes joueurs et les mêmes questions.",
    () => startLive(false), { okLabel: 'Recommencer', danger: true });
});

$('#btnStopGame')?.addEventListener('click', () => {
  showConfirmModal(
    "Arrêter la partie maintenant ? Le classement est établi sur les scores actuels et envoyé aux téléphones.",
    () => arreterPartie(), { okLabel: 'Arrêter la partie', danger: true });
});

/**
 * Termine une partie en cours depuis le salon, sur les scores sauvegardés.
 * Passe par le podium normal : même classement, mêmes punchlines, même diffusion aux
 * téléphones — une partie arrêtée ne doit pas finir en queue de poisson pour la table.
 */
function arreterPartie() {
  const g = H.game; if (!g) return;
  const L = g.live || {};
  clearInterval(H.timerId);
  H.scores = Object.assign({}, L.scores);
  g.couples.forEach(c => { if (H.scores[c.id] == null) H.scores[c.id] = 0; });
  H.stats = Object.assign({ asked: 0, correct: 0 }, L.stats);
  H.finalist = [...g.couples].sort((a, b) => (H.scores[b.id] || 0) - (H.scores[a.id] || 0))[0];
  H.round = 'final';
  H.final = { idx: 0, correct: 0, errors: 0, left: 0, over: false };
  endFinal(true, 'Partie arrêtée avant la fin.', { mention: 'partie arrêtée', arretee: true });
}

/* ══════════════ FICHE JOUEUR ══════════════ */
const fermerFiche = () => $('#peekModal')?.classList.remove('is-open');
$('#peekClose')?.addEventListener('click', fermerFiche);
$('#peekModal')?.addEventListener('click', e => { if (e.target === $('#peekModal')) fermerFiche(); });

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
      icon('arrow-right', 'history-go'));
    item.addEventListener('click', () => { location.hash = '#/host/' + g.code; });
    box.append(item);
  });
}

function detach() {
  if (H.unsubGame) { H.unsubGame(); H.unsubGame = null; }
  if (H.unsubPlayers) { H.unsubPlayers(); H.unsubPlayers = null; }
  if (H.unsubGuesses) { H.unsubGuesses(); H.unsubGuesses = null; }
}
export function leaveHost() { detach(); clearInterval(H.timerId); }
