# map-front — coque, DA et parcours

## Direction artistique
Plateau TV kitsch années 2000 : bleu nuit (`--bleu-900/800`), cœur rouge bombé gloss
(`--rouge`), script doré (`--or`, police Pacifico). Décor fixe : trois faisceaux de
projecteur animés (`.beam`) + un rideau de velours en dégradé masqué (`.curtain`).
Boutons à ombre portée dure (effet « touche de plateau ») qui s'enfonce au clic.
Identité originale : aucun élément de la marque télé n'est repris.

## Iconographie — vendor/fontawesome
Aucun emoji dans l'interface : tout passe par Font Awesome 6 Free Solid. Le paquet n'est
**pas** chargé depuis un CDN mais vendorisé en sous-ensemble : `pyftsubset` ne garde que
les 46 glyphes réellement utilisés, soit **5,5 ko** de woff2 au lieu de ~150 ko. C'est une
PWA — les icônes doivent survivre au mode hors-ligne, et le service worker les met en cache
avec le reste de la coque.
*Conséquence à retenir* : ajouter une icône ne se fait pas en écrivant une classe `fa-…`
dans le HTML, il faut régénérer le sous-ensemble (voir l'entête de `vendor/fontawesome/fa.css`),
sinon le glyphe s'affiche en carré vide.
Les helpers `icon(nom)` (élément) et `iconHtml(nom)` (chaîne) de `util.js` sont le seul
point de création : les noms d'icônes vivent dans les données (`THEMES[].icon`,
`SPICE[].icon`, `rankFor().icon`), jamais en dur dans le rendu.

## Garde-fou CSS : `[hidden]`
Le JS pilote la visibilité par l'attribut `hidden` (chrono de finale, verdict, note 18+,
historique d'accueil…). La règle navigateur `[hidden]{display:none}` a une spécificité
nulle : la moindre règle de classe qui pose un `display` réaffiche l'élément. C'est arrivé
deux fois — `.tv-timer{display:flex}` laissait le chrono de finale visible pendant toutes
les manches, `.adult-note{display:block}` affichait l'avertissement 18+ en permanence.
Le reset contient désormais `[hidden]{display:none!important}` en tête de feuille.

## sw.js — service worker : RÉSEAU D'ABORD

**Piège majeur, corrigé en v3.** La v1 était en cache-first avec un nom de cache figé
(`bibi-love-v1`) : un navigateur ayant ouvert l'app une seule fois gardait éternellement
l'ancien CSS et l'ancien JS, et **aucun correctif déployé ne l'atteignait jamais**. Le
symptôme observé était un chrono de finale visible pendant toutes les manches alors que
le code était déjà corrigé depuis deux versions — on cherche le bug dans le mauvais
fichier pendant une heure.

Stratégie actuelle : réseau d'abord pour le code (HTML/CSS/JS), cache en secours si
hors-ligne ; cache d'abord pour les polices et images, dont le contenu ne change pas.
`VERSION` en tête de fichier purge les anciens caches à l'activation.
`c.add()` fichier par fichier plutôt qu'`addAll()` : un seul chemin manquant faisait
échouer l'installation entière du cache.

## js/live.js — contrat de la manette

Le téléphone du devineur ne pilote rien : il **réagit** à ce que l'hôte publie dans
`games/{code}.bc`. L'écran joueur est entièrement dérivé de ce broadcast, sans état local
propre — c'est ce qui le rend insensible à un rechargement de page en pleine partie.

- `broadcast({...})` — construit l'objet publié. Aucune valeur `undefined` : Firestore
  les refuse et fait échouer l'écriture entière.
- `estMonTour(bc, uid)` — le téléphone affiche les **contrôles** seulement si
  `bc.guesserUid === uid`. L'énoncé, lui, est affiché à tout le monde : chacun lit la même
  question sur son téléphone, et les deux réponses s'affichent au même instant pour toute
  la table quand l'hôte valide. C'est ce qui supprime les « il a dit quoi ? ».
- **Rien qui révèle la réponse ne figure dans un broadcast de phase QUESTION.** Le doc de
  partie est lisible par tout joueur authentifié : y mettre `truth`, `expected` ou les
  libellés mettrait la réponse dans le téléphone du devineur avant qu'il ne réponde. Ces
  champs ne sont renseignés qu'à la révélation. Un test vérifie explicitement l'absence de
  fuite.
- **`seq`** est la clé de la robustesse : il s'incrémente à chaque question. Un choix qui
  arrive avec un `seq` périmé (téléphone en retard, double tap, reconnexion) est ignoré
  côté hôte. Sans ça, une réponse à la question précédente marquerait des points sur la
  suivante.
- *Piège corrigé* : le broadcast était d'abord écrit dans `games/{code}.live.bc`.
  `persistLive()` réécrit l'objet `live` **en entier** à chaque transition et effaçait la
  diffusion publiée une ligne plus haut — les téléphones restaient bloqués sur la question
  précédente. Le broadcast vit désormais dans son propre champ `bc`, à la racine du doc.

## js/app.js — routeur

- `route()` — routeur sur `location.hash`. Cinq routes : `#/` accueil, `#/create`
  création, `#/compte` statut et identifiant, `#/host/CODE` salon+plateau,
  `#/j/CODE` questionnaire joueur. Détache
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
- `accordPronoms(texte, genre)` / `accordSuffixes(texte, genre)` — accord en genre à partir
  du champ `gender` renseigné par le joueur à l'inscription. Les pronoms (`il/elle`,
  `ton/ta`) et les terminaisons (`gêné(e)`, `furieux(se)`, `passager(e)`) sont traités
  **séparément** parce qu'ils ne parlent pas de la même personne, voir `selfPrompt`.
  *Ordre des règles critique* : les cas qui suppriment une lettre (`x(se)` → `se`,
  `f(ve)` → `ve`) doivent passer avant la règle générique `(e)`, sinon « furieux(se) »
  devient « furieuxse ». Genre `n` (neutre) : rien n'est touché, les formes doubles
  restent affichées telles quelles.
- `selfPrompt(q, genreSoi, genrePartenaire)` — **deux genres dans la même phrase** : les
  terminaisons parlent du répondant, les pronoms et « ton/ta partenaire » parlent de
  l'autre. Les confondre est l'erreur évidente ici, d'où deux paramètres distincts.
- `guessPrompt(q, prénom, genreSource)` — construit l'énoncé lu par celui qui devine ; tout
  y parle du répondant, donc un seul genre. Gère l'élision : « la réponse de Ash » se lit
  mal, la fonction écrit « d'Ash » (`de`/`que` devant voyelle ou h). Sans ça, un prénom sur
  trois produit une phrase bancale à l'écran.
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
- `publish(bc)` / `publishReveal()` — diffusion vers les téléphones à chaque transition.
  Non bloquante : si l'écriture échoue, la partie continue sur l'écran maître seul, les
  boutons y restent cliquables. La manette est un confort, jamais un point de panne.
- `onGuesses(list)` — reçoit les choix des téléphones et vérifie `seq` avant de valider,
  voir `js/live.js`.
- `enterCompte()` (app.js) — **le seul écran qui expose l'uid anonyme**. Sans lui,
  impossible de créer son propre `hosts/{uid}` pour se débloquer : l'identifiant n'est
  écrit nulle part ailleurs. Voir `map-monetisation.md`.
- `openPaywall(why)` — seul point d'entrée de l'offre. Le texte `why` vient de
  `guard()` : l'argument de vente est écrit à côté de la limite qu'il débloque.
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
- Genre demandé à l'inscription (`#joinGender`, stocké dans `players/{uid}.gender`) :
  c'est lui qui alimente les accords de `game.js`. Trois valeurs — `f`, `h`, `n`.
- `onGameUpdate(g)` — bascule le téléphone en mode manette dès que la partie passe en
  `live`. `renderTour` / `renderResultat` / `renderRecap` sont de pures fonctions du
  broadcast : aucun état de partie n'est gardé côté joueur.
- `envoyerChoix(bc, token)` — un seul choix par `seq` (`state.sent`), sinon un double tap
  envoie deux réponses. En cas d'échec réseau, le joueur est invité à répondre à voix
  haute plutôt que de rester bloqué.

## Questions personnalisées — composeur joueur

`enterCustom()` et les fonctions qui suivent dans `player.js`. Le joueur écrit des
questions **pour** son/sa partenaire : un énoncé et **la réponse attendue en texte
libre**. Pas de QCM — imposer quatre propositions obligeait l'auteur à inventer trois
mauvaises réponses, ce qui tue l'intérêt d'une question écrite à la main. C'est l'hôte
qui arbitre à l'écran.

- **Le contenu est illisible par le/la partenaire** (`custom/{uid}`, mêmes règles que
  `answers`). Sans ce cloisonnement la fonctionnalité n'a aucun intérêt.
- `players/{uid}.customCount` duplique le nombre écrit : le salon affiche l'avancement
  sans que l'hôte lise le contenu des questions avant la soirée.
- La limite (3 gratuit / 12 complet) vient de `game.maxCustom`, figé à la création depuis
  le plan de l'**hôte**. La lire sur l'appareil de l'invité donnerait la limite gratuite à
  tout le monde alors que l'organisateur a payé pour la table — bug trouvé au banc de test.
### Corriger un verdict (`corrigerVerdict`)

Après chaque verdict des manches 1 à 3 (réponse libre arbitrée **ou** QCM), le pied du
plateau affiche `#btnCorriger` : « Erreur : compter faux » / « Erreur : compter juste ».
Il retourne le verdict autant de fois que nécessaire tant qu'on n'est pas passé à la
question suivante (`renderLive` le masque et remet `H.verdict` à `null`).

- La correction touche **tout** ce que le verdict avait touché : score du couple, stats
  de complicité, bandeau, bordure de la réponse libre, et **rediffusion** aux téléphones
  (`publishReveal`) — un téléphone réaffiche le résultat à chaque diffusion REVEAL, donc
  le joueur voit « Bonne réponse » devenir « Mauvaise réponse ».
- Sauvegardée par `persistLive()` comme toute transition : une reprise de partie
  repart du score corrigé.
- `afficherVerdict()` est le seul endroit qui dessine le bandeau : verdict initial et
  verdict corrigé ne peuvent pas diverger.
- **Pas en finale** : elle enchaîne seule 900 ms après chaque réponse, sous chrono.
- Pas de toast de confirmation : il s'affichait pile par-dessus le bouton pendant 2 s,
  empêchant de recliquer ; le changement de verdict se voit déjà en grand.

### Partie en cours : reprendre, recommencer, arrêter

Quand une partie est reprenable, le salon affiche sous « Reprendre la partie » deux
actions (`#lobbyLiveActions`), toutes deux derrière `showConfirmModal` :

- **Recommencer à zéro** — `startLive(false)` : scores à 0, mêmes joueurs, mêmes
  questions (en ton perso le plan est recalculé à l'identique).
- **Arrêter la partie** — `arreterPartie()` : reconstitue scores et stats depuis
  `games/{code}.live`, désigne le couple en tête et passe par le **podium normal**
  (`endFinal` → `showPodium`), donc classement, punchlines et diffusion aux téléphones
  identiques à une fin de partie. `finalResult.arretee` marque le cas.

`showPodium(win, why, opts)` accepte `opts.mention`, qui remplace « finale réussie/ratée »
dans le résumé du mode duo : une partie arrêtée ou une partie perso (sans finale) ne doit
pas afficher le résultat d'une finale qui n'a pas eu lieu.

Avant ça, la seule sortie d'une partie commencée était **Supprimer**, qui efface aussi
les questionnaires et les questions écrites.

### Fiche joueur au salon (`ouvrirFiche`)

Chaque place du salon est un **bouton** portant un libellé **« Voir »**, doublé d'une ligne
d'aide sous le nom du couple : le clic ouvre `#peekModal` et affiche, question par question,
ce que le joueur a rempli. L'affordance est explicite et non un simple curseur ou une icône
discrète — sur mobile il n'y a pas de survol, et la première version (une icône ⓘ en bout de
carte) n'a pas été comprise au banc d'essai : personne ne devine qu'une carte d'état est
cliquable. Ça répond à la seule question que l'hôte se pose
vraiment avant de lancer — « 5/19, mais lesquelles ? » — et permet de vérifier qu'un
questionnaire n'a pas été bâclé.

- **L'hôte est le seul lecteur autorisé** (`firestore.rules`) : c'est structurellement le
  seul écran de l'app où ce contenu peut s'afficher. Un joueur qui ouvrirait la même vue
  n'obtiendrait rien.
- **Lecture à la demande**, jamais en écoute permanente : ouvrir une fiche ne doit pas
  coûter une lecture Firestore à chaque frappe des autres joueurs. `allCustom`/`allAnswers`
  sont appelés avec **le seul joueur concerné**, pas toute la table.
- Les réponses passent par `optionsFor()` + `selfPrompt()`, donc s'affichent **exactement
  comme le joueur les a vues**, accords en genre compris. Réafficher l'option brute
  (`q.o[token]`) montrerait « gêné(e) » là où le joueur a lu « gênée ».
- Le mode décide de ce qu'on montre : en ton perso ce sont les questions écrites (avec le
  prénom du destinataire), sinon le questionnaire tiré. Les deux se cumulent si l'hôte a
  activé le mix.
- Une question sans réponse reste **listée** en grisé plutôt que masquée : c'est
  précisément ce que l'hôte cherche à repérer.

- `js/data/idees.js` — boîte à idées. Ce sont des **amorces**, pas des questions toutes
  faites : elles servent à débloquer quelqu'un devant une page blanche. `tirerIdees(3)`
  en tire trois sans doublon, le bouton en retire d'autres.

## Questions personnalisées — côté plateau

- `buildPlan(ids, perRound, {perso})` remplace les **dernières** questions des manches 1
  et 2, dont la source est justement fixe (A puis B). Au moins une question standard
  reste par manche, et le `qid` d'origine est conservé dans le step : c'est le repli.
- `resoudreQuestion(step, source)` (host.js) — pour une étape `custom`, pioche la n-ième
  question de l'auteur du couple ; s'il n'a pas écrit assez, retombe sur la question
  Bibi Love d'origine. **Le repli est décidé couple par couple** : un couple qui n'a rien
  écrit ne prive pas les autres. C'est pourquoi `chargerPlan` utilise le *maximum* écrit
  par un auteur, jamais le minimum.
- Une question perso est diffusée avec `kind: 'texte'` ; tout le reste — score, punchline,
  persistance, podium — passe par le même `appliquerVerdict()` que la QCM.
- Déroulé de l'arbitrage : le devineur écrit sa réponse sur son téléphone → elle s'affiche
  sur l'écran partagé → l'hôte clique **Dévoiler** (la réponse attendue apparaît alors, et
  seulement alors) → **Ça colle** / **Raté**. Le bouton « Suivant » reste masqué tant que
  l'hôte n'a pas tranché, pour qu'aucune question ne puisse être sautée par réflexe.
- Le bouton Dévoiler fonctionne même si le devineur n'a rien tapé : une réponse donnée à
  l'oral doit rester arbitrable, la manette est un confort.
- *Piège corrigé* : la branche « X n'a rien rempli » se déclenchait sur les questions
  perso, où `truth` est `null` par construction. Elle est désormais réservée aux questions
  de la banque.

## js/data/verdicts.js — le ton du jeu

Toutes les phrases affichées après une réponse ou sur un podium viennent d'ici, jamais du
rendu. Le parti pris est assumé : on charrie franchement les derniers (« Vous êtes sûrs
d'être ensemble ? »), on encense sans retenue les premiers (« Faits l'un pour l'autre »).
C'est la signature du jeu, pas de la décoration — changer ces textes change le produit.
`pioche(liste, clé)` évite de resservir deux fois de suite la même punchline.

## sw.js
Cache-first sur la coque uniquement. **N'intercepte que les GET de sa propre origine** :
laisser passer les requêtes tierces est indispensable, sinon le SDK Firebase se fait
répondre `index.html` et le navigateur refuse le module (« MIME type text/html »).
