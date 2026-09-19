# decisions — Bibi Love

## Format de jeu

**3 manches + finale, questions QCM uniquement.** Le 100 % QCM permet à l'app d'arbitrer
seule : pas d'animateur qui doit trancher « est-ce que ça compte ? » au milieu de la
soirée. Barème : 10 pts en manches 1 et 2, 25 pts en manche bonus, finale en tout ou rien
(7 questions / 45 s / défaite à la 4e erreur).

**La même question est posée à tous les couples avant de passer à la suivante.** Plus
rythmé que de dérouler un couple entier, et tout le monde entend la même chose.

**Les joueurs répondent sur eux-mêmes en amont, le conjoint devine en live.** C'est ce
qui rend le jeu jouable en une heure : la phase longue (20 min de questionnaire par
personne) est sortie de la soirée.

## Choix techniques

**Devinette sur le téléphone ET sur l'écran maître.** ~~Décision initiale : écran maître
seul.~~ Revenu dessus : le devineur répond depuis son mobile, avec son animation et son
récap. L'écran maître garde ses boutons cliquables — la manette est un confort, jamais un
point de panne, et si une écriture Firestore échoue la soirée continue sans que personne
ne s'en aperçoive. L'écran partagé reste le lieu du suspense : il affiche la question, la
révélation et les scores, le téléphone ne fait qu'enregistrer le choix.

**Pas de Cloud Functions — sauf pour Stripe.** Le seul secret du jeu (les réponses du
conjoint) est couvert par les règles Firestore, ce qui garde le projet sur le plan
gratuit. La monétisation force l'exception : vérifier un paiement côté client est
impossible, et les règles interdisent déjà d'écrire `hosts/{uid}` depuis le navigateur —
sinon n'importe qui se passe premium depuis la console. **Une** fonction webhook, et une
seule. Voir `map-monetisation.md`.

**Le modèle payant ne verrouille pas un thème.** Verrouiller « Intime » et « Sans filtre »
aurait paru évident, mais un couple qui joue en famille ne paierait jamais pour débloquer
du contenu qu'il ne veut pas. Les limites sont donc transverses — taille de la banque,
durée des parties, nombre de couples — pour que tout le monde finisse par les rencontrer,
quel que soit le ton choisi. Le format complet, la manette et les punchlines restent
gratuits : il faut vivre une soirée entière et réussie avant de buter sur la limite.

**Le genre est demandé à l'inscription, pas déduit du prénom.** Trois choix explicites
(féminin, masculin, neutre) plutôt qu'une liste de prénoms ou une supposition à partir du
réglage « couples mixtes ». Le neutre laisse les formes doubles intactes (« gêné(e) »),
ce qui reste lisible et n'oblige personne à se ranger dans une case.

**Pas de compte hôte (email/mot de passe).** L'hôte est identifié par son uid anonyme et
retrouve ses parties via le localStorage. Contrepartie assumée : changer d'appareil fait
perdre l'accès animateur à une partie en cours. Le jour où le multi-appareil devient
nécessaire, ajouter l'auth email sans toucher au modèle de données (`hostUid` reste la
clé).

**Toutes les questions chargées en amont dans l'app, pas en base.** Une partie ne stocke
que la liste d'ids tirés : zéro latence pendant le jeu, questionnaire disponible
hors-ligne, et modifier la banque ne demande aucune migration.

## Identité

Nom et logo originaux (cœur rouge bombé, script doré sur bleu nuit). L'esprit visuel des
jeux télé de complicité conjugale des années 2000 est repris, jamais la marque, le
wordmark ni le nom d'une émission existante.

**L'état du plateau est persisté en base, pas seulement en mémoire.** Un rafraîchissement
de page en pleine soirée qui remettrait les scores à zéro est inacceptable : `persistLive()`
écrit manche, question, couple courant, scores et état de finale dans `games/{code}.live`
à chaque transition. Coût : ~20 écritures Firestore par partie, largement dans le gratuit.
La sauvegarde a lieu après la révélation, et la reprise enchaîne donc sur la question
suivante — sinon les points de la dernière question seraient comptés deux fois.

**Font Awesome vendorisé en sous-ensemble, pas de CDN.** Les emojis ne rendent pas pareil
d'un OS à l'autre (et pas du tout sur certains Android), ce qui casse une DA qui repose sur
la cohérence visuelle. Font Awesome règle ça, mais un `<link>` vers un CDN aurait deux
défauts : les icônes disparaissent hors-ligne alors que le questionnaire, lui, fonctionne
sans réseau ; et ça ajoute une dépendance externe pour ~150 ko. Le sous-ensemble des 42
icônes utilisées pèse 5,3 ko et vit dans le repo.

**Le niveau « Sans filtre » (18+) est cloisonné, pas cumulatif.** Les trois premiers
niveaux s'empilent ; le quatrième est un pool séparé, dans les deux sens. Choisir Familial
ne peut jamais faire remonter une question explicite par hasard de tirage — c'est la
propriété qui rend le lien envoyable à n'importe qui sans relire ce qu'il contient. Et
choisir Sans filtre donne un questionnaire à 100 % explicite, sans dilution. Un
avertissement 18+ s'affiche à la création **et** sur l'écran du joueur qui reçoit le lien,
avec une porte de sortie explicite.

**Les options d'une QCM sont neutres, jamais conjuguées.** Défaut de conception des
premières versions : 100 questions sur 230 avaient des options à la première ou à la
troisième personne (« J'y vais jamais », « Se lève direct »). Comme la même liste
d'options est affichée au joueur qui répond sur lui-même **et** à celui qui devine, une
de ces deux lectures sonnait toujours faux. Les trois règles de rédaction sont dans
`map-donnees.md` ; six questions dont les options étaient « Moi / Lui-elle » ont été
converties en type `who`, qui affiche les vrais prénoms.

**Le ton provocateur est une décision produit, pas de la décoration.** Le jeu charrie
franchement les derniers et encense sans retenue les premiers. Tout le texte vit dans
`js/data/verdicts.js` : changer ces phrases change le produit, pas son habillage.

**Une soirée perso est un ton à part entière, pas une option cochée au lancement.**
~~Première version : un sélecteur dans le salon, au moment de lancer.~~ Trop tard dans le
parcours : l'organisateur envoie le lien des jours avant et doit pouvoir annoncer la
couleur dès l'invitation. Mélanger questions de la banque et questions perso dans une même
soirée brouillait aussi le propos. Le ton 5 « Questions perso » se choisit à la création,
change le message d'invitation, supprime le questionnaire côté joueur et fait disparaître
le sélecteur du salon. Le mode mixte reste disponible sur les tons 1 à 4, pour qui veut
juste pimenter une partie classique.

**Les questions perso remplacent, elles ne s'ajoutent pas.** Les insérer en plus
allongerait la partie au-delà de l'heure visée. Elles prennent la place des dernières
questions des manches 1 et 2 — dont la source est déjà fixe, ce qui évite toute
gymnastique — et au moins une question de la banque reste par manche pour garder le
rythme du jeu.

**Le repli est décidé couple par couple, pas partie par partie.** Exiger que tous les
couples aient écrit leurs questions rendrait le mode inutilisable dès qu'un invité ne
joue pas le jeu. Un couple sans questions perso reçoit simplement les questions Bibi Love
d'origine, sans que personne ne s'en aperçoive.

**C'est l'auteur qui détient la bonne réponse.** Faire répondre le/la partenaire en amont
aurait imposé une deuxième passe asynchrone après l'écriture — impossible à orchestrer
avant une soirée. L'auteur écrit la réponse attendue, devient la « source », et le jeu
fonctionne comme avec une question de la banque.

**Les questions perso sont en réponse libre, arbitrées par l'hôte.** ~~Première version :
QCM comme le reste.~~ Imposer quatre propositions obligeait l'auteur à inventer trois
mauvaises réponses — un travail pénible qui vide la question de sa saveur. Le devineur
écrit ce qu'il croit, l'hôte compare les deux textes à l'écran et tranche. C'est la seule
place où un humain arbitre, et elle est justifiée : personne ne sait mieux que la table si
« des pâtes » couvre « les pâtes carbo de ma mère ».

**Tout le monde voit la question sur son téléphone, pas seulement celui qui répond.**
L'écran partagé reste le lieu du suspense, mais les téléphones suppriment les « il a dit
quoi ? » : même énoncé pour tous, et les deux réponses affichées au même instant quand
l'hôte valide. Corollaire non négociable : aucun champ révélant la réponse ne transite
dans la diffusion avant la validation, le doc de partie étant lisible par tous.

## Pièges rencontrés

- **Service worker et requêtes tierces** : intercepter les GET cross-origin fait répondre
  `index.html` au SDK Firebase, et le navigateur refuse le module (« MIME type
  text/html »). Le SW ne traite que sa propre origine.
- **`classList.add(a, '')`** lève `DOMTokenList: token must not be empty`. Ne jamais
  passer une chaîne conditionnelle vide à `add()`.
- **Tokens de réponse absolus.** Pour les questions « qui de vous deux », l'option est
  stockée comme `A|B|BOTH|NONE` (slot), jamais comme « moi / l'autre » : sinon la réponse
  d'un joueur n'est pas comparable au pronostic de l'autre.
- **Modale réutilisable** : les écouteurs de `#confirmModalOk` doivent être détruits à la
  fermeture (`replaceWith(cloneNode())`), sinon le second usage déclenche deux callbacks.
- **`[hidden]` neutralisé par une règle de classe** : voir la section dédiée de
  `map-front.md`. Toute nouvelle règle posant un `display` sur un élément piloté par
  `hidden` referait le bug sans le garde-fou `!important`.
- **Service worker en cache-first avec un nom de cache figé** : le correctif du point
  précédent était déployé mais n'atteignait aucun navigateur ayant déjà ouvert l'app.
  On cherche le bug dans le code alors qu'il est dans la distribution. Le SW est passé en
  réseau-d'abord pour le code — c'est le piège le plus coûteux du projet à ce jour.
- **Une limite de plan lue du mauvais côté** : le nombre de questions perso était lu sur
  l'appareil de l'invité, qui n'a rien acheté, alors que l'hôte avait payé pour la table.
  Toute limite qui concerne la partie doit être figée dans le doc de partie à la création,
  jamais recalculée chez l'invité.
- **Filtrer une liste sans réindexer ce qui la référence** : les options vides étaient
  retirées à l'enregistrement mais l'index de la bonne réponse pointait sur la liste
  d'avant.
- **`catch {}` vide sur une lecture qui décide d'un état visible** : `refreshPremium()`
  masquait un refus de règles Firestore, et l'utilisateur voyait « version gratuite » sans
  aucun moyen de comprendre pourquoi. Une erreur qui change ce que voit l'utilisateur doit
  toujours ressortir quelque part dans l'interface.
- **`!!valeur` sur un champ saisi à la main** : la console Firebase propose le type
  « chaîne » par défaut, et `"true"` passait pour vrai. Comparaison stricte obligatoire sur
  tout champ qu'un humain peut typer de travers.
- **Ajouter du contenu sans regarder la répartition existante** : la banque avait dérivé
  vers 189 questions de complicité contre 57 de souvenirs, et les tons Intime et Sans
  filtre n'avaient presque que de la complicité. Toute extension part désormais du
  tableau thème × ton, pas de l'inspiration du moment.
- **Un module front importé par un script de contrôle** : `util.js` touchait `window` au
  chargement (réveil de l'audio), ce qui faisait planter tous les scripts de vérification
  de la banque lancés hors navigateur. Garde `typeof window !== 'undefined'`.
- **Écrire un sous-objet et le réécrire juste après** : le broadcast de la manette était
  publié dans `live.bc`, puis `persistLive()` réécrivait `live` en entier et l'effaçait.
  Deux écritures qui se marchent dessus dans le même tour de rendu, sans erreur visible.
- **Navigation par hash vers la route courante** : écrire `location.hash = '#/host/CODE'`
  alors qu'on y est déjà ne déclenche pas `hashchange`, donc le routeur ne s'exécute pas.
  Le bouton « Quitter » du plateau rappelle `enterLobby()` directement.

## Limitations connues

- L'exclusion des questions déjà jouées est locale à l'appareil de l'hôte.
- Un couple à un seul joueur inscrit voit ses questions annulées faute de source.
- Le chrono de la finale est sauvegardé au grain de la question, pas de la seconde : une
  reprise en plein milieu d'une question rend le temps restant du début de celle-ci.

## Ton « Questions perso » : la partie est dimensionnée par ce qui a été écrit, sans finale

Un couple qui écrit 12 questions chacun s'attend à les voir **toutes** jouées. Le cadre
classique (durée → questions par manche, finale réservée au couple en tête) ne le permet
pas : en 1 h, au mieux 37 questions sur 48, et les questions placées en finale sont
perdues pour tous les couples non finalistes. D'où, dans ce ton seulement :

- la taille des manches vient du nombre de questions écrites (max par place A/B), pas
  de la durée ;
- pas de finale : le couple en tête au terme de la manche bonus gagne ;
- jamais de repli sur la banque, une étape sans question est sautée.

Contrepartie assumée : la durée n'est plus garantie. 48 questions à réponse libre
arbitrée tiennent à peu près dans l'heure (~1 min par question), 4 couples × 12 × 2 non.
Si ça devient un problème, la bonne réponse est de plafonner le nombre de questions
écrites par joueur selon le nombre de couples, pas de réintroduire des questions banque.

