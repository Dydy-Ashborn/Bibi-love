# map-donnees — modèle Firestore, sécurité, banque de questions

## Arborescence

```
games/{code}                       doc de partie — écrit par l'hôte seul
  ├─ players/{uid}                 prénom, coupleId, slot, answered, done
  └─ answers/{uid}                 { [questionId]: token }
```

`code` = 5 caractères tirés d'un alphabet sans `I O 0 1` (`makeCode`) : dictable à voix
haute sans ambiguïté.

### games/{code}
`hostUid`, `status` (`lobby|live|finished`), `mode` (`duo|tournoi`), `spice` (1-3),
`pairing` (`mixte|libre`), `durationMin`, `perRound`, `couples[]`
(`{id, name, score}`), `questionIds[]`, `finalistId`, `finalResult`, `live`.

#### games/{code}.live — état du plateau, sauvegardé en continu
`{ started, round (1|2|3|'final'), qIdx, coupleIdx, phase ('idle'|'question'|'reveal'),
scores {coupleId: points}, stats {asked, correct}, finalistId,
final {idx, correct, errors, left, over}, updatedAt }`

Écrit par `persistLive()` à chaque transition. C'est ce qui permet de rafraîchir la page,
de fermer l'onglet ou de changer d'écran maître sans perdre les scores : au retour dans
le salon, le bouton devient « Reprendre la partie » et `startLive(true)` restaure tout.
`phase: 'idle'` = partie créée mais jamais lancée.

Les questions ne sont **pas** en base : elles vivent dans `js/data/questions.js`, seule
la liste d'identifiants tirés est stockée. Zéro lecture Firestore pour afficher une
question, et le questionnaire fonctionne hors-ligne une fois la coque en cache.

### answers/{uid}
Un document par joueur, clé = id de question, valeur = token
(`"0".."3"` pour une QCM, `A|B|BOTH|NONE` pour un « qui de vous deux »).

## Sécurité (firestore.rules)

Le seul secret du jeu, ce sont les réponses du conjoint. La règle qui compte :

```
match /answers/{playerId} {
  allow read:  if signedIn() && (request.auth.uid == playerId || isHost(gameId));
  allow write: if signedIn() && request.auth.uid == playerId;
}
```

Un joueur qui ouvrirait la console ne peut lire que son propre document. L'hôte lit
tout — c'est lui qui arbitre. Conséquence assumée : **pas de Cloud Functions**, donc pas
de plan Blaze ni de déploiement de fonctions à maintenir.

Autres points :
- `allow update` sur la partie vérifie `resource.data.hostUid` (état *avant* écriture) et
  interdit de réécrire `hostUid` — sinon n'importe qui s'auto-promeut animateur.
- `allow delete` n'utilise jamais `request.resource.data` (toujours `null` sur un delete).
- La lecture du doc de partie est ouverte à tout compte authentifié : un joueur doit
  pouvoir lire la config (niveau, couples, liste de questions) pour rejoindre.

## Mémoire locale de l'hôte (localStorage)

- `bibi.host.games` — 12 dernières parties créées, affichées sur l'accueil.
- `bibi.host.usedQuestions` — 400 derniers ids joués, exclus des tirages suivants.
  C'est ce qui permet d'enchaîner plusieurs parties dans la soirée sans répétition.
  *Limite connue* : c'est par appareil. Changer d'écran maître repart de zéro. (L'état
  d'une partie en cours, lui, est en base et suit l'hôte partout.)
- `bibi.player.name` — prénom pré-rempli quand un joueur rejoint une seconde partie.
- `bibi.mute` — son coupé.

## Banque de questions (js/data/questions.js)

127 questions : 60 familial · 38 gênant · 29 intime, sur 4 thèmes
(quotidien, souvenirs, goûts, complicité).

Les trois tons sont bien distincts : **Gênant** = révélations sur le couple (mensonges,
ex, défauts, jalousie), rien de sexuel ; **Intime** = registre allusif de fin de soirée,
jamais explicite. Les clés internes restent `piquant` / `tres_piquant` (les libellés
affichés sont dans `SPICE`, à modifier là et nulle part ailleurs).

- `s` = ton de la question. Le pool est **cumulatif** : choisir « Intime » inclut
  les niveaux inférieurs, avec priorité au niveau choisi dans le tirage.
- `k:'self'` — question sur soi. `q` est posé au répondant, `g` au conjoint qui devine
  (`{p}` = prénom du répondant). Les deux formulations sont indispensables : la même
  phrase ne marche pas dans les deux sens.
- `k:'who'` — « qui de vous deux… ». Une seule formulation, options générées à partir
  des prénoms du couple.

Pour ajouter des questions : respecter le préfixe d'id (`s`/`w` + niveau + numéro), ne
jamais réutiliser un id existant (les parties en cours référencent les ids), et garder
exactement 4 options pour une `self`.
