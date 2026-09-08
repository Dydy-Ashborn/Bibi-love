# map-front — coque, DA et parcours

## Direction artistique
Plateau TV kitsch années 2000 : bleu nuit (`--bleu-900/800`), cœur rouge bombé gloss
(`--rouge`), script doré (`--or`, police Pacifico). Décor fixe : trois faisceaux de
projecteur animés (`.beam`) + un rideau de velours en dégradé masqué (`.curtain`).
Boutons à ombre portée dure (effet « touche de plateau ») qui s'enfonce au clic.
Identité originale : aucun élément de la marque télé n'est repris.

## js/app.js — routeur

- `route()` — routeur sur `location.hash`. Quatre routes : `#/` accueil, `#/create`
  création, `#/host/CODE` salon+plateau, `#/j/CODE` questionnaire joueur. Détache
  systématiquement les écouteurs Firestore (`leaveHost`/`leavePlayer`) avant de changer
  d'écran, sinon les `onSnapshot` s'empilent d'une navigation à l'autre.
- `boot()` — attend `ready()` (auth anonyme) avec un plafond de 9 s. Au-delà, affiche
  un message explicite pointant l'authentification anonyme : c'est *la* panne la plus
  probable sur un projet Firebase neuf.
- Raccourcis clavier sur le plateau : `A/B/C/D` répondent, `Espace`/`Entrée` avancent.
  Prévu pour animer au clavier sans viser à la souris devant tout le monde.

## js/util.js — socle

- `showScreen(id)` — bascule la classe `.is-active` ; un seul `<section class="screen">`
  visible à la fois, toutes les vues vivent dans `index.html`.
- `showConfirmModal(msg, onConfirm, opts)` — modale maison `#confirmModal`. **Aucun
  `alert`/`confirm` natif dans le projet.** Les écouteurs sont détruits par
  `replaceWith(cloneNode())` à la fermeture, sinon un second appel déclenche deux fois
  le callback.
- `sfx` — sons synthétisés en WebAudio (oscillateurs) : zéro fichier audio à héberger,
  zéro requête réseau. Coupables via `#btnMute` (persisté en localStorage).
- `burst(kind, count)` — confettis / cœurs en `<span>` animés CSS, auto-nettoyés après
  3,6 s. Pas de canvas : plus simple et suffisant à ce volume.

## js/game.js — logique pure (ni DOM ni Firestore)

- `questionCount(durée)` — 30/45/60 min → 3/4/5 questions par manche, total
  `3×n + 7` (les 7 de la finale). C'est ce total que chaque joueur remplit en amont.
- `drawQuestions({spice, durationMin, exclude})` — tire la liste de la partie. Priorise
  le niveau choisi, alterne `self`/`who` (1 « qui de vous deux » toutes les 3), exclut
  les questions déjà jouées par cet hôte. Si le pool est épuisé, recycle plutôt que de
  rendre une liste trop courte.
- `buildPlan(ids, perRound)` — mappe les questions sur les manches. M1 : le slot A a
  répondu, B devine. M2 : l'inverse. M3 (bonus) : la source alterne A/B. Finale :
  7 questions, source = slot A.
- `optionsFor(q, names)` — deux familles d'options. `self` → les 4 propositions écrites,
  token = index (`"0".."3"`). `who` → options dynamiques `[prénomA, prénomB, Les deux,
  Ni l'un ni l'autre]`, token = `A|B|BOTH|NONE`. **Le token est absolu, pas relatif au
  joueur** : c'est ce qui permet de comparer la réponse de l'un au pronostic de l'autre.
- `roundSubtitle(round, pairing, couple)` — libellé de manche. `pairing:'mixte'` →
  « les femmes / les hommes » ; `pairing:'libre'` → annonce par prénoms.
- `rankFor(ratio)` — rang de complicité du mode Duo (Colocataires → Âmes sœurs).

## js/host.js — parcours animateur

- `enterCreate()` / `syncCreateUI()` — formulaire de création. Les `.choice-grid[data-field]`
  écrivent directement dans l'objet `cfg` ; passer en mode Duo force la liste à un seul
  couple, passer en Tournoi en impose deux au minimum.
- `enterLobby(code)` — refuse l'accès si `hostUid !== uid()` et redirige vers le
  questionnaire : un joueur qui ouvrirait l'URL d'admin tombe sur son propre parcours.
- `startLive(resume)` — charge **toutes** les réponses d'un coup (`allAnswers`) puis joue
  hors-ligne. Aucune lecture Firestore pendant la partie : pas de latence au moment
  du suspense. Avec `resume=true`, restaure l'état sauvegardé (manche, question, couple
  courant, scores, stats, finale). *Piège* : la sauvegarde a lieu **après** la révélation,
  donc si l'état repris est en phase `reveal`, on enchaîne directement sur la question
  suivante — rejouer celle-là compterait les points une seconde fois.
- `persistLive()` — écrit l'état du plateau dans `games/{code}.live` à chaque transition
  (révélation, question suivante, manche suivante, chaque question de finale). Non
  bloquante par choix : un échec réseau ne doit jamais figer la partie en cours. Coût
  réel : une vingtaine d'écritures Firestore par partie.
- `canResume(g)` / `resumeLabel(g)` — une partie est reprenable si `status === 'live'` et
  `live.phase !== 'idle'`. Le libellé du bouton du salon en découle : « Lancer »,
  « Reprendre » ou « Relancer » selon l'état.
- `renderLive()` — affiche question + options pour le couple courant. Deux cas dégradés
  gérés à l'écran : place vide (question annulée) et joueur qui n'a pas répondu à cette
  question (annoncé, 0 point en jeu) — ça arrive dès qu'un invité n'a pas fini.
- `answer(token, truth, couple, step)` — révélation. Marque le choix, la vraie réponse
  (`is-truth`), éteint le reste (`is-dim`). *Piège corrigé* : `classList.add(a, b?b:'')`
  jette `DOMTokenList: token must not be empty` — ne jamais passer de chaîne vide.
- `advance()` — parcourt couple → question → manche. Ordre volontaire : la même question
  est posée à tous les couples avant de passer à la suivante (rythme télé).
- `startFinal()` / `resumeFinalTimer()` / `nextFinal()` / `endFinal()` — finale du couple
  en tête : 7 questions, 45 s, défaite au-delà de 3 erreurs. `H.final.over` protège du
  double-appel quand le chrono expire pile sur une réponse. Le chrono est reparti de
  `H.final.left` (et non de 45) pour qu'une reprise ne rende pas le temps déjà écoulé.
  `endFinal` ne compte dans les stats que les questions réellement posées : un chrono qui
  expire à la 3e ne doit pas plomber le rang de complicité avec 4 questions jamais vues.
- `showPodium(win, why)` — classement en Tournoi, rang de complicité en Duo (basé sur
  `H.stats.correct / H.stats.asked`, finale comprise).
- `renderHistory()` — parties précédentes lues dans le localStorage de l'hôte.
- Bouton « Quitter » du plateau : rappelle `enterLobby()` directement. *Piège corrigé* :
  on est déjà sur `#/host/CODE`, donc réécrire `location.hash` ne déclenche aucun
  `hashchange` et le bouton restait sans effet.

## js/player.js — parcours invité

- `enterJoin(code)` — si le joueur a déjà un document `players/{uid}`, saute l'inscription
  et reprend le questionnaire là où il l'avait laissé.
- Attribution du slot : le premier arrivé d'un couple prend `A`, le second `B`. Un couple
  déjà complet est grisé et non cliquable.
- `pick(q, token)` — écrit la réponse **à chaque clic** (pas à la fin) : un joueur qui
  ferme l'onglet ne perd rien. L'écriture est volontairement non bloquante ; en cas
  d'échec réseau, un toast prévient sans figer l'interface.
- `refreshQuizOptions()` — quand le partenaire rejoint après coup, les questions
  « qui de vous deux » sont re-rendues pour afficher son vrai prénom à la place du
  libellé générique.

## sw.js
Cache-first sur la coque uniquement. **N'intercepte que les GET de sa propre origine** :
laisser passer les requêtes tierces est indispensable, sinon le SDK Firebase se fait
répondre `index.html` et le navigateur refuse le module (« MIME type text/html »).
