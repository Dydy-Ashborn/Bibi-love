# map-donnees — modèle Firestore, sécurité, banque de questions

## Arborescence

```
games/{code}                       doc de partie — écrit par l'hôte seul
  ├─ players/{uid}                 prénom, gender, coupleId, slot, answered, done
  ├─ answers/{uid}                 { [questionId]: token }
  ├─ custom/{uid}                  { items: [{q, a}] } — question + réponse attendue, texte libre
  └─ guesses/{uid}                 { seq, token | text } — manette téléphone
hosts/{uid}                        { premium } — écrit par le webhook Stripe seul
```

`code` = 5 caractères tirés d'un alphabet sans `I O 0 1` (`makeCode`) : dictable à voix
haute sans ambiguïté.

### games/{code}
`hostUid`, `status` (`lobby|live|finished`), `mode` (`duo|tournoi`), `spice` (1-5),
`pairing` (`mixte|libre`), `durationMin`, `perRound`, `couples[]`
(`{id, name, score}`), `questionIds[]`, `finalistId`, `finalResult`, `live`, `bc`,
`maxCustom`.

`maxCustom` est figé à la création depuis le plan de l'**hôte** : ses invités écrivent
autant de questions que son plan l'autorise, sans avoir rien acheté.

#### games/{code}.bc — diffusion vers les téléphones
Champ **séparé de `live`**, et c'est structurel : `persistLive()` réécrit `live` en entier
à chaque transition et effacerait la diffusion. Contenu et rôle de `seq` : voir
`js/live.js` et `map-front.md`.

#### games/{code}/players/{uid}.gender
`f` | `h` | `n`. Choisi par le joueur à l'inscription, jamais déduit du prénom. Alimente
les accords en genre des énoncés (`game.js`).

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

`custom/{uid}` et `guesses/{uid}` suivent la même logique : chacun n'écrit que le sien. Les questions perso sont en
revanche **fermées en lecture** comme les réponses — si le/la partenaire pouvait les lire
avant la soirée, la fonctionnalité perdrait tout son sens. Un choix de manette, lui, est
révélé à l'écran dans la seconde : sa lecture reste ouverte.

`hosts/{uid}` est en **lecture seule pour le client** (`allow write: if false`) : il n'est
écrit que par le webhook Stripe via l'Admin SDK, qui contourne les règles. Sans ça,
n'importe qui se passe premium depuis la console du navigateur.

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

629 questions : 180 familial · 156 gênant · 123 intime · **170 sans filtre (18+)**.

**Répartition par thème du niveau 4** (complicité 86 · goûts 31 · souvenirs 27 · quotidien 26).
Le niveau 4 étant cloisonné, c'est sa taille propre qui compte : 170 questions = 7 à 10
soirées en 45/60 min avant répétition, contre 5 auparavant — la raison de l'ajout.
La banque penchait initialement très fort vers la complicité (189 contre 57 en souvenirs),
et les tons intimes n'avaient quasiment que ça : une soirée « Intime » posait toujours les
mêmes questions de couple, jamais de quotidien ni de souvenirs. L'écart est désormais
contenu ; la complicité reste majoritaire, c'est le cœur du jeu, mais elle ne monopolise
plus les tons élevés. De quoi enchaîner une bonne dizaine de
soirées sans répétition, le tirage excluant les questions déjà jouées.

**Le ton 5 « Questions perso » n'est pas un ton de contenu**, mais il se choisit au même
endroit et au même moment que les autres — c'est ce qui compte pour l'organisateur, qui
décide de la couleur de sa soirée en une seule fois. Conséquences :

- **aucune question de la banque n'est jouée, jamais** — pas même en repli : personne
  n'a rempli de questionnaire dans ce mode, une QCM de la banque s'afficherait « X n'a
  rien rempli ». Une étape sans question écrite pour un couple est **sautée** par l'hôte
  (`sauterEtape`). `poolForSpice(5)` ne sert plus qu'à remplir `questionIds` à la
  création (le doc de partie en exige), ces ids ne sont pas joués ;
- **c'est ce qui a été écrit qui dimensionne la partie, pas la durée** (`planPerso`) :
  manche 1 = première moitié des questions de A, manche 2 = première moitié de B,
  manche bonus = le reste en alternance, **pas de finale**. 4 joueurs × 12 = 48 questions
  jouées. La durée choisie à la création n'a donc pas d'effet dans ce ton ;
- *Bug corrigé* : la première version réutilisait le plan du mode mixte (questions perso
  en fin de manches 1 et 2 seulement, plafonnées à `perRound − 1`). Une partie « 100 %
  perso » en 1 h posait ~8 questions écrites par couple et comblait avec des QCM mortes ;
- le lien ne propose **que** le composeur : faire remplir 19 questions qui ne seraient
  jamais jouées serait absurde (`estTonPerso()` masque la carte questionnaire du hub) ;
- le sélecteur « Questions des couples » du salon disparaît : il n'y a rien à arbitrer,
  la partie EST la partie perso. Le laisser visible ferait croire à l'hôte qu'il peut
  revenir en arrière, alors que personne n'a rempli de questionnaire.

**`poolForSpice` n'est cumulatif que jusqu'au niveau 3.** Le niveau 4 est cloisonné dans
les deux sens : le choisir ne ramène aucune question des niveaux inférieurs (un
questionnaire annoncé « sans filtre » qui demanderait le petit-déjeuner préféré serait
absurde), et surtout choisir Familial/Gênant/Intime ne peut **jamais** faire remonter une
question explicite. C'est la garantie qui compte : le lien envoyé à la belle-famille ne
peut pas contenir de niveau 4 par accident de tirage.

Les trois tons sont bien distincts : **Gênant** = révélations sur le couple (mensonges,
ex, défauts, jalousie), rien de sexuel ; **Intime** = registre allusif de fin de soirée,
jamais explicite. Les clés internes restent `piquant` / `tres_piquant` (les libellés
affichés sont dans `SPICE`, à modifier là et nulle part ailleurs).

- `s` = ton de la question. Pool cumulatif de 1 à 3 (choisir « Intime » inclut Familial et
  Gênant, avec priorité au niveau choisi) ; le niveau 4 est isolé, voir ci-dessus.
- `k:'self'` — question sur soi. `q` est posé au répondant, `g` au conjoint qui devine
  (`{p}` = prénom du répondant). Les deux formulations sont indispensables : la même
  phrase ne marche pas dans les deux sens.
- `k:'who'` — « qui de vous deux… ». Une seule formulation, options générées à partir
  des prénoms du couple.

### Les trois règles de rédaction (à respecter pour toute question ajoutée)

1. **Les options sont neutres — ni « je », ni « tu », ni « il/elle ».** C'est la règle la
   plus importante et la moins évidente : les options sont affichées **à l'identique** au
   joueur qui répond sur lui-même et à celui qui devine. Une option comme « J'y vais
   jamais » ou « Se lève direct » ne peut pas être correcte des deux côtés. On écrit des
   groupes nominaux ou des infinitifs : « Jamais, c'est l'autre qui y va », « Se lever
   direct ». Exception : une citation entre guillemets (« J'arrive dans cinq minutes »)
   est le contenu de la réponse, elle se lit pareil dans les deux sens.
2. **Jamais de « lui/elle » ni de possessif sans référent dans l'énoncé.** « Ton surnom
   pour lui/elle » ou « Sa partie du corps que tu préfères » forcent le lecteur à deviner
   de qui on parle. On écrit « ton/ta partenaire », que `g` remplace naturellement par le
   prénom.
3. **Une question dont les options seraient « Moi / Lui-elle » doit être `k:'who'`**, pas
   une QCM : le type `who` génère les vrais prénoms et supprime l'ambiguïté.

Pour ajouter des questions : respecter le préfixe d'id (`s`/`w` + niveau + numéro), ne
jamais réutiliser un id existant (les parties en cours référencent les ids), et garder
exactement 4 options pour une `self`.

*Piège rencontré* : une virgule en trop entre deux entrées (`},,`) crée un **trou** dans le
tableau — un `undefined` que `QUESTIONS.length` compte mais que `.filter(q => !q)` ne voit
pas (`filter` saute les trous). Le tirage renvoie alors un id fantôme et `byId()` plante en
pleine partie. La vérification qui l'attrape est une boucle indexée
(`for (let n = 0; n < QUESTIONS.length; n++) if (QUESTIONS[n] === undefined)`), pas un
`filter`.
