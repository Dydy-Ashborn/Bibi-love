# map-monetisation — plan gratuit / complet

## Le raisonnement de découpage

Le piège évident serait de verrouiller un thème : « Intime » et « Sans filtre » payants,
le reste gratuit. Ça ne marche pas — un couple qui joue en famille ne paiera jamais pour
débloquer du contenu qu'il ne veut pas. La limite doit toucher **tout le monde**, quel
que soit le ton choisi.

Ce sont donc les dimensions transverses qui sont bridées :

| | Gratuit | Complet (4,99 € une fois) |
|---|---|---|
| Questions tirables | 60 (30 par niveau) | 377 |
| Tons | Familial, Gênant | + Intime, + Sans filtre (18+) |
| Durée de partie | 30 min | 30 / 45 / 60 min |
| Couples en tournoi | 2 | 4 |
| Manette téléphone | ✅ | ✅ |
| Punchlines, podium, finale | ✅ | ✅ |

**Ce qui reste gratuit est délibérément généreux** : le format complet (3 manches +
finale), la manette sur téléphone et les punchlines sont l'argument de vente. Un joueur
doit vivre une soirée entière et réussie avant de rencontrer la limite. C'est la
répétition des questions à la deuxième ou troisième soirée qui déclenche l'achat, pas
une porte fermée à la première minute.

**L'organisateur paie, la table en profite.** Le déblocage est attaché à l'hôte
(`hosts/{uid}`), pas aux invités : ceux-ci n'installent rien et ne voient jamais de
paywall. Un seul achat suffit pour un groupe entier — c'est ce qui rend le prix
acceptable.

## js/plan.js — point de contrôle unique

Aucune vérification de plan ailleurs dans le code. Ajouter une restriction = ajouter une
entrée dans `guard()`, jamais un `if` dans une vue.

- `guard(feature, value)` → `{ok, why}`. `why` est le texte affiché dans le paywall :
  l'argument de vente est écrit à côté de la limite qu'il débloque, pas dans un fichier
  marketing séparé.
- `limitePool(pool)` — restreint le tirage aux N premières questions de chaque niveau.
  Découpe **déterministe** : deux parties gratuites successives piochent dans le même
  sous-ensemble. C'est voulu — c'est la répétition qui se fait sentir.
- `isPremium()` / `refreshPremium()` — le localStorage n'est qu'un cache de confort pour
  éviter une interface qui clignote au démarrage. La source de vérité est
  `hosts/{uid}.premium` en base.
- `resume()` — texte du bandeau de l'écran de création.

## Interface

Les options payantes restent **visibles et cliquables**, avec un cadenas. Le clic ouvre
l'offre. Une option grisée et morte ne donne envie de rien ; une option qu'on touche et
qui explique ce qu'elle débloque, si.

## Ce qu'il reste à brancher : Stripe

Le flux d'achat n'est pas fonctionnel : il manque la seule brique qui exige un serveur.

1. Créer un **Payment Link** Stripe en mode `payment` (achat unique, pas d'abonnement)
   et renseigner `LIEN_PAIEMENT` dans `js/plan.js`.
2. Passer le `uid` anonyme de l'hôte en `client_reference_id` sur le lien
   (`?client_reference_id=<uid>`) — c'est ce qui rattache le paiement au bon compte.
3. Déployer **une** Cloud Function webhook sur `checkout.session.completed` qui écrit
   `hosts/{client_reference_id}.premium = true` via l'Admin SDK.
4. Secrets (clé secrète, secret du webhook) dans `functions/.env`, jamais
   `functions:config:set` (déprécié).

**Cette étape revient sur la décision « pas de Cloud Functions »** prise au départ (voir
`decisions.md`). C'est assumé : vérifier un paiement côté client est impossible, et les
règles Firestore interdisent déjà l'écriture de `hosts/{uid}` depuis le navigateur —
sinon n'importe qui se passe premium depuis la console. Le passage au plan Blaze est
la contrepartie.

## Se débloquer soi-même (propriétaire du projet)

L'écran **Mon compte** (`#/compte`, lien discret en bas de l'accueil) existe pour ça :
c'est le seul endroit qui affiche l'uid anonyme. Sans lui il est impossible de savoir
quel document créer — l'identifiant n'est écrit nulle part et n'apparaît dans aucune
interface Firebase tant qu'aucune donnée ne lui est rattachée.

Console Firebase → Firestore → Démarrer une collection → `hosts` / *coller l'uid* /
champ `premium` de type **booléen** valeur `true`. Puis « Vérifier mon statut » dans l'app.

**Deux pièges qui font rester en « version gratuite » alors que le document existe :**

1. **Les règles ne sont pas déployées.** La lecture de `hosts/{uid}` est refusée et
   l'app ne voit rien. `firebase deploy --only firestore:rules`. C'est la cause la plus
   fréquente, et elle était invisible : `refreshPremium()` avalait l'erreur dans un
   `catch {}` vide. L'écran Mon compte affiche désormais la raison exacte du refus.
2. **`premium` saisi en type « chaîne »** au lieu de « booléen ». La console Firebase
   propose la chaîne par défaut et `"true"` ressemble à `true`. La comparaison est
   maintenant stricte (`=== true`) et le diagnostic nomme le problème.

Le champ `diagPremium()` de `js/plan.js` porte ces quatre états — `absent`,
`mauvais-type`, `sans-premium`, `refus` — et alimente le bandeau de l'écran Mon compte.

Pourquoi pas un code de déblocage saisi dans l'app : il devrait être comparé côté client,
donc lisible dans le JS par n'importe qui, donc partageable en une capture d'écran. Passer
par Firestore ne coûte que trente secondes, une seule fois.

## Ce que ce verrouillage protège — et ce qu'il ne protège pas

Tout le contrôle du plan est **côté client**. Quelqu'un qui ouvre la console du navigateur
peut écrire `localStorage.setItem('bibi.premium','1')` et débloquer l'interface : le
`guard()` le croira jusqu'au prochain `refreshPremium()`, qui le remettra en gratuit. Ce
n'est pas une faille à corriger, c'est le compromis assumé d'une app sans serveur à
4,99 € — le contournement coûte plus d'efforts que le prix.

Ce qui est en revanche réellement protégé : `hosts/{uid}` est en écriture refusée par les
règles (`allow write: if false`). Personne ne peut rendre son déblocage **durable** ni le
faire porter par une partie qu'il crée pour d'autres.

## Limitation connue

Le déblocage est attaché à l'uid anonyme de l'appareil de l'hôte. Changer de téléphone,
vider les données du navigateur ou passer en navigation privée perd l'achat — y compris
pour un déblocage propriétaire, qu'il faut alors refaire sur le nouvel identifiant. D'où
le bouton « Copier l'identifiant » : le noter quelque part suffit à le retrouver.

Le jour où ça devient gênant, la vraie réponse est une connexion Google optionnelle
(`linkWithPopup` sur l'utilisateur anonyme) : l'uid devient stable et suit l'appareil.
Ça se greffe sans toucher au modèle de données — `hostUid` reste la clé — et ça règle
l'achat perdu en même temps que le déblocage propriétaire.
