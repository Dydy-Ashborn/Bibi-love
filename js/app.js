/* Bibi Love — routeur et amorçage. */
import { $, iconHtml, showScreen, toast, sfx, toggleMute, isMuted } from './util.js';
import { ready } from './firebase.js';
import { enterCreate, enterLobby, renderHistory, leaveHost } from './host.js';
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
  const wait = Math.max(0, 900 - (Date.now() - t0));
  setTimeout(route, wait);
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
