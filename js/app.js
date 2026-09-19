/* Bibi Love — routeur et amorçage. */
import { $, iconHtml, showScreen, toast, sfx, toggleMute, isMuted } from './util.js';
import { ready } from './firebase.js';
import { enterCreate, enterLobby, renderHistory, leaveHost, openPaywall } from './host.js';
import { refreshPremium, isPremium, diagPremium, resume as planResume, PRIX, LIEN_PAIEMENT } from './plan.js';
import { uid } from './firebase.js';
import { copy } from './util.js';
import { enterJoin, leavePlayer } from './player.js';

/* ── Routes ───────────────────────────────────────────────────────
   #/            accueil
   #/create      création de partie
   #/host/CODE   salon puis plateau (hôte)
   #/j/CODE      questionnaire joueur
   ───────────────────────────────────────────────────────────────── */
async function route() {
  const hash = location.hash || '#/';
  leaveHost(); leavePlayer();

  if (hash.startsWith('#/j/')) {
    const code = hash.slice(4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    await enterJoin(code);
    return;
  }
  if (hash.startsWith('#/host/')) {
    const code = hash.slice(7).toUpperCase().replace(/[^A-Z0-9]/g, '');
    await enterLobby(code);
    return;
  }
  if (hash === '#/create') { enterCreate(); return; }
  if (hash === '#/compte') { enterCompte(); return; }

  renderHistory();
  showScreen('screen-home');
}

window.addEventListener('hashchange', route);

document.addEventListener('click', e => {
  const t = e.target.closest('[data-goto]');
  if (t) { location.hash = t.dataset.goto; sfx.tap(); }
});

$('#btnGoCreate')?.addEventListener('click', () => { location.hash = '#/create'; sfx.tap(); });
$('#btnGoJoin')?.addEventListener('click', () => {
  const code = $('#inputJoinCode').value.trim().toUpperCase();
  if (code.length < 4) { toast('Il faut le code à 5 lettres.', 'err'); return; }
  location.hash = '#/j/' + code;
});
$('#inputJoinCode')?.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnGoJoin').click(); });

/* ── Mon compte ──────────────────────────────────────────────────────────
 * Le seul écran qui expose l'uid anonyme. Sans lui, impossible de savoir quel
 * document `hosts/{uid}` créer pour se débloquer soi-même — l'identifiant n'est
 * écrit nulle part ailleurs et n'apparaît dans aucune interface Firebase avant
 * la première écriture.
 */
function enterCompte() {
  const r = planResume();
  $('#compteplan').textContent = r.titre;
  $('#compteDetail').textContent = isPremium()
    ? r.ligne + ' Tes invités en profitent sans rien acheter.'
    : r.ligne + ` Version complète : ${PRIX}, une seule fois.`;
  $('#compteUid').textContent = uid() || '…';

  // Diagnostic explicite : sans lui, un « version gratuite » alors que le document
  // existe bien en base est impossible à expliquer sans ouvrir la console.
  const d = diagPremium();
  const box = $('#compteDiag');
  box.hidden = isPremium() || d.etat === 'jamais';
  box.className = 'diag ' + (d.etat === 'refus' ? 'is-err' : 'is-warn');
  box.textContent = d.message;

  showScreen('screen-compte');
}

$('#btnCompteRefresh')?.addEventListener('click', async () => {
  const btn = $('#btnCompteRefresh');
  btn.disabled = true;
  const ok = await refreshPremium();
  btn.disabled = false;
  toast(ok ? 'Version complète active.' : "Toujours en version gratuite.", ok ? 'ok' : 'err');
  enterCompte();
});

$('#btnCompteCopy')?.addEventListener('click', async () => {
  const ok = await copy(uid() || '');
  toast(ok ? 'Identifiant copié.' : uid(), ok ? 'ok' : 'info');
});

/* ── Paywall : achat et restauration ─────────────────────────────────────── */
$('#paywallPrice') && ($('#paywallPrice').textContent = PRIX);

$('#paywallBuy')?.addEventListener('click', () => {
  if (!LIEN_PAIEMENT) {
    toast("Le lien de paiement n'est pas encore configuré.", 'err');
    return;
  }
  // On repasse par l'app au retour : le webhook Stripe a écrit hosts/{uid}.premium,
  // `refreshPremium()` au démarrage suivant le relit.
  location.href = LIEN_PAIEMENT;
});

$('#paywallRestore')?.addEventListener('click', async () => {
  const ok = await refreshPremium();
  toast(ok ? 'Version complète débloquée.' : "Aucun achat trouvé sur ce compte.", ok ? 'ok' : 'err');
  if (ok) { $('#paywall').classList.remove('is-open'); route(); }
});

const muteBtn = $('#btnMute');
const muteIcon = on => iconHtml(on ? 'volume-high' : 'volume-xmark');
muteBtn.innerHTML = muteIcon(!isMuted());
muteBtn.addEventListener('click', () => { muteBtn.innerHTML = muteIcon(toggleMute()); });

/* Raccourcis clavier pour l'animateur : A/B/C/D pour répondre, Espace pour avancer. */
document.addEventListener('keydown', e => {
  if (!$('#screen-live').classList.contains('is-active')) return;
  if (e.target.matches('input, textarea')) return;
  const k = e.key.toUpperCase();
  const idx = 'ABCD'.indexOf(k);
  if (idx >= 0) { document.querySelectorAll('#liveOptions .opt')[idx]?.click(); e.preventDefault(); }
  if (e.code === 'Space' || e.key === 'Enter') { $('#btnLiveNext')?.click(); e.preventDefault(); }
});

/* ── Boot ─────────────────────────────────────────────────────────── */
(async function boot() {
  const t0 = Date.now();
  try {
    await Promise.race([ready(), new Promise((_, rej) => setTimeout(rej, 9000))]);
  } catch {
    document.querySelector('.loader-text').textContent =
      "Connexion à Firebase impossible. Vérifie que l'authentification anonyme est activée.";
    return;
  }
  refreshPremium();                       // non bloquant : l'interface s'ouvre sans attendre
  const wait = Math.max(0, 900 - (Date.now() - t0));
  setTimeout(route, wait);
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
