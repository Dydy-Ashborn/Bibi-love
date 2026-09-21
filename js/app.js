/* Bibi Love — routeur et amorçage. */
import { $, iconHtml, showScreen, toast, sfx, toggleMute, isMuted } from './util.js';
import { ready } from './firebase.js';
import { enterCreate, enterLobby, renderHistory, leaveHost, openPaywall } from './host.js';
import { refreshPremium, isPremium, diagPremium, resume as planResume,
         PRIX, LIEN_PAIEMENT, urlPaiement, attendrePaiement } from './plan.js';
import { uid } from './firebase.js';
import { copy, burst } from './util.js';
import { enterJoin, leavePlayer } from './player.js';
import { initLegal } from './legal.js';

/* ── Routes ───────────────────────────────────────────────────────
   #/            accueil
   #/create      création de partie
   #/host/CODE   salon puis plateau (hôte)
   #/j/CODE      questionnaire joueur
   ───────────────────────────────────────────────────────────────── */
async function route() {
  const hash = location.hash || '#/';
  $('#paywall')?.classList.remove('is-open');
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
  if (hash === '#/cgv') { showScreen('screen-cgv'); return; }
  if (hash === '#/cgu') { showScreen('screen-cgu'); return; }

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
const paywallConsent = $('#paywallConsent');
const paywallBuy = $('#paywallBuy');

function syncPaywallBuy() {
  if (!paywallBuy) return;
  paywallBuy.disabled = !LIEN_PAIEMENT || !paywallConsent?.checked;
  paywallBuy.textContent = LIEN_PAIEMENT ? 'Payer et débloquer' : 'Bientôt disponible';
}

paywallConsent?.addEventListener('change', syncPaywallBuy);
syncPaywallBuy();

if (!LIEN_PAIEMENT && paywallBuy) {
  $('#paywallBuy').disabled = true;
  $('#paywallBuy').textContent = 'Bientôt disponible';
}

$('#paywallBuy')?.addEventListener('click', () => {
  if (!paywallConsent?.checked) {
    toast('Confirme les conditions avant de continuer.', 'err');
    return;
  }
  const url = urlPaiement();
  if (!url) {
    toast("Le paiement n'est pas encore ouvert. Reviens bientôt !", 'err');
    return;
  }
  // On marque le départ vers Stripe : au retour, `verifierRetourPaiement()` saura
  // qu'il faut attendre le webhook au lieu d'afficher froidement « version gratuite ».
  try {
    sessionStorage.setItem('bibi.achat', '1');
    sessionStorage.setItem('bibi.consentementAchat', new Date().toISOString());
  } catch {}
  location.href = url;
});

/**
 * Retour depuis Stripe. Le webhook peut mettre quelques secondes à écrire
 * `hosts/{uid}` : on patiente avec un message clair plutôt que d'annoncer un échec
 * à quelqu'un qui vient de payer.
 */
async function verifierRetourPaiement() {
  let attendu = false;
  try { attendu = sessionStorage.getItem('bibi.achat') === '1'; } catch {}
  const retour = location.hash.includes('paiement=ok');
  if (!attendu && !retour) return;
  try { sessionStorage.removeItem('bibi.achat'); } catch {}

  if (isPremium()) return;
  toast('Validation de ton achat…', 'info');
  const ok = await attendrePaiement();
  if (ok) {
    $('#paywall')?.classList.remove('is-open');
    toast('Version complète débloquée. Merci !', 'ok');
    burst('confetti', 90);
    route();
  } else {
    toast("Paiement non confirmé pour l'instant. Touche « Vérifier mon statut » dans Mon compte d'ici une minute.", 'err');
  }
}

$('#paywallRestore')?.addEventListener('click', async () => {
  const ok = await refreshPremium();
  toast(ok ? 'Version complète débloquée.' : "Aucun achat trouvé sur cet appareil.", ok ? 'ok' : 'err');
  if (ok) { $('#paywall').classList.remove('is-open'); route(); }
});

/* Bouton son. Un clic accidentel coupait le son de façon permanente sans que rien
   ne l'annonce : l'icône barrée est discrète et l'état survit aux rechargements.
   On confirme désormais chaque bascule par un toast, et le titre nomme l'action. */
const muteBtn = $('#btnMute');
const muteIcon = on => iconHtml(on ? 'volume-high' : 'volume-xmark');
function majMute(actif) {
  muteBtn.innerHTML = muteIcon(actif);
  muteBtn.classList.toggle('is-muted', !actif);
  muteBtn.title = actif ? 'Couper le son' : 'Réactiver le son';
  muteBtn.setAttribute('aria-label', muteBtn.title);
}
majMute(!isMuted());
muteBtn.addEventListener('click', () => {
  const actif = toggleMute();
  majMute(actif);
  toast(actif ? 'Son réactivé' : 'Son coupé', actif ? 'ok' : 'info');
  if (actif) sfx.good();
});

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
initLegal();

(async function boot() {
  const t0 = Date.now();
  try {
    await Promise.race([ready(), new Promise((_, rej) => setTimeout(rej, 9000))]);
  } catch {
    document.querySelector('.loader-text').textContent =
      "Connexion à Firebase impossible. Vérifie que l'authentification anonyme est activée.";
    return;
  }
  refreshPremium().then(verifierRetourPaiement);   // non bloquant : l'interface s'ouvre sans attendre
  const wait = Math.max(0, 900 - (Date.now() - t0));
  setTimeout(route, wait);
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
