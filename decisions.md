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

**Devinette sur l'écran maître, pas sur le téléphone du conjoint.** Le suspense vit sur
l'écran partagé ; faire cliquer depuis le mobile ajoute une synchro temps réel à
déboguer pour un gain de mise en scène nul. Noté comme évolution possible, pas comme
manque. Les téléphones ne servent qu'à la phase amont.

**Pas de Cloud Functions.** Le seul secret à protéger (les réponses du conjoint) est
couvert par les règles Firestore. Cela garde le projet sur le plan gratuit et supprime
un déploiement à maintenir. À reconsidérer seulement si l'arbitrage devait passer côté
serveur.

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
- **Navigation par hash vers la route courante** : écrire `location.hash = '#/host/CODE'`
  alors qu'on y est déjà ne déclenche pas `hashchange`, donc le routeur ne s'exécute pas.
  Le bouton « Quitter » du plateau rappelle `enterLobby()` directement.

## Limitations connues

- L'exclusion des questions déjà jouées est locale à l'appareil de l'hôte.
- Un couple à un seul joueur inscrit voit ses questions annulées faute de source.
- Le chrono de la finale est sauvegardé au grain de la question, pas de la seconde : une
  reprise en plein milieu d'une question rend le temps restant du début de celle-ci.
