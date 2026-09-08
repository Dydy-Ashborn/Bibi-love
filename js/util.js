/* Bibi Love — helpers DOM, modale maison, sons synthétisés, particules.
 * Aucune alerte native : toute confirmation passe par showConfirmModal(). */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Crée une icône Font Awesome (sous-ensemble vendorisé dans vendor/fontawesome). */
export function icon(name, extra = '') {
  const i = document.createElement('i');
  i.className = 'fa fa-' + name + (extra ? ' ' + extra : '');
  i.setAttribute('aria-hidden', 'true');
  return i;
}

/** Même chose en chaîne, pour les endroits qui construisent du HTML. */
export function iconHtml(name, extra = '') {
  return `<i class="fa fa-${name}${extra ? ' ' + extra : ''}" aria-hidden="true"></i>`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

export function showScreen(id) {
  $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === id));
  window.scrollTo(0, 0);
}

/* ── Modale de confirmation maison (jamais confirm()) ───────────────────── */
export function showConfirmModal(message, onConfirm, opts = {}) {
  const modal = $('#confirmModal');
  $('#confirmModalText').textContent = message;
  const ok = $('#confirmModalOk');
  const no = $('#confirmModalCancel');
  ok.textContent = opts.okLabel || 'Confirmer';
  no.textContent = opts.cancelLabel || 'Annuler';
  ok.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');

  const close = () => {
    modal.classList.remove('is-open');
    ok.replaceWith(ok.cloneNode(true));
    no.replaceWith(no.cloneNode(true));
    modal.removeEventListener('click', backdrop);
  };
  const backdrop = e => { if (e.target === modal) close(); };

  ok.addEventListener('click', () => { close(); onConfirm && onConfirm(); });
  no.addEventListener('click', close);
  modal.addEventListener('click', backdrop);
  modal.classList.add('is-open');
}

/* ── Toast ─────────────────────────────────────────────────────────────── */
let toastTimer = null;
export function toast(msg, kind = 'info') {
  const t = $('#toast');
  t.textContent = msg;
  t.dataset.kind = kind;
  t.classList.add('is-open');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-open'), 2600);
}

/* ── Sons synthétisés (aucun fichier audio à héberger) ──────────────────── */
let actx = null;
const audioOn = () => localStorage.getItem('bibi.mute') !== '1';
export function toggleMute() {
  const muted = localStorage.getItem('bibi.mute') === '1';
  localStorage.setItem('bibi.mute', muted ? '0' : '1');
  return !muted;
}
export function isMuted() { return localStorage.getItem('bibi.mute') === '1'; }

function ctx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function blip(freq, start, dur, type = 'sine', gain = 0.18) {
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
}

export const sfx = {
  tap()    { if (audioOn()) blip(660, 0, 0.08, 'triangle', 0.1); },
  good()   { if (!audioOn()) return; [0, .09, .18].forEach((t, i) => blip([523,659,880][i], t, .28, 'triangle', .22)); },
  bad()    { if (!audioOn()) return; blip(200, 0, .22, 'sawtooth', .16); blip(150, .12, .35, 'sawtooth', .16); },
  reveal() { if (audioOn()) { blip(392, 0, .12, 'sine', .12); blip(494, .1, .2, 'sine', .12); } },
  tick()   { if (audioOn()) blip(1200, 0, .03, 'square', .05); },
  win()    { if (!audioOn()) return; [523,659,784,1047].forEach((f,i)=>blip(f, i*.11, .5, 'triangle', .2)); },
  lose()   { if (!audioOn()) return; [440,392,330,262].forEach((f,i)=>blip(f, i*.14, .5, 'sawtooth', .13)); }
};

/* ── Particules : confettis + cœurs ────────────────────────────────────── */
export function burst(kind = 'confetti', count = 90) {
  const layer = $('#fxLayer');
  const colors = ['#ff2d55', '#ffd166', '#ffffff', '#ff7096', '#ffb703'];
  for (let n = 0; n < count; n++) {
    let p;
    if (kind === 'hearts') {
      p = icon('heart');
      p.className += ' fx-heart';
      p.style.color = colors[n % colors.length];
      p.style.fontSize = (18 + Math.random() * 20).toFixed(0) + 'px';
    } else {
      p = document.createElement('span');
      p.className = 'fx-confetti';
      p.style.background = colors[n % colors.length];
    }
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDelay = (Math.random() * 0.6).toFixed(2) + 's';
    p.style.animationDuration = (1.8 + Math.random() * 1.6).toFixed(2) + 's';
    p.style.setProperty('--drift', (Math.random() * 200 - 100).toFixed(0) + 'px');
    p.style.setProperty('--spin', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    layer.append(p);
    setTimeout(() => p.remove(), 3600);
  }
}

export function shake(node) {
  node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake');
}

/* ── Divers ────────────────────────────────────────────────────────────── */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeCode(len = 5) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

export function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}
