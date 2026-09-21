# map-index — Bibi Love

Aiguillage global. Aucun détail comportemental ici : voir les maps spécialisées.

| Module | Fichier(s) | Map | Statut |
|---|---|---|---|
| Coque PWA, routeur, boot | `index.html`, `js/app.js`, `sw.js`, `manifest.webmanifest` | [map-front](map-front.md) | ✅ v2 |
| Direction artistique | `css/style.css`, `icons/` | [map-front](map-front.md) | ✅ v1 |
| Iconographie (Font Awesome vendorisé) | `vendor/fontawesome/` | [map-front](map-front.md) | ✅ 46 icônes, 5,5 ko |
| Parcours hôte (création → plateau → podium) | `js/host.js` | [map-front](map-front.md) | ✅ v3 (fiche joueur au salon) |
| Parcours joueur (rejoindre → questionnaire → manette) | `js/player.js` | [map-front](map-front.md) | ✅ v2 |
| Manette téléphone (contrat de diffusion) | `js/live.js` | [map-front](map-front.md) | ✅ v1 |
| Logique de jeu pure + accords en genre | `js/game.js`, `js/config.js` | [map-front](map-front.md) | ✅ v2 |
| Punchlines et rangs | `js/data/verdicts.js` | [map-front](map-front.md) | ✅ v1 |
| Questions personnalisées + boîte à idées | `js/data/idees.js`, `js/player.js` | [map-front](map-front.md) | ✅ v1 |
| Plan gratuit / complet (point de contrôle unique) | `js/plan.js` | [map-monetisation](map-monetisation.md) | ✅ Webhook prêt à déployer |
| Écran « Mon compte » (uid + statut) | `js/app.js`, `#/compte` | [map-monetisation](map-monetisation.md) | ✅ v1 |
| Accès Firestore + mémoire locale hôte | `js/store.js`, `js/firebase.js` | [map-donnees](map-donnees.md) | ✅ v2 |
| Banque de questions | `js/data/questions.js` | [map-donnees](map-donnees.md) | ✅ 629 questions · 5 tons (dont « Questions perso ») |
| Règles de sécurité | `firestore.rules` | [map-donnees](map-donnees.md) | ✅ v2 |

## Chantiers ouverts

- [x] **Stripe** : une Cloud Function webhook écrit `hosts/{uid}.premium` — voir
      `map-monetisation.md`. Le déploiement et la configuration du Dashboard restent à faire.
- [ ] Déploiement réel : `firebase deploy` non encore lancé (auth anonyme à activer d'abord).
- [x] Manette téléphone : le devineur répond depuis son mobile, animation et récap sur son écran.
- [x] Reprise de partie en cours : état sauvegardé dans `games/{code}.live`, bouton « Reprendre » au salon.
- [x] Questions écrites par les couples, jouées en manches 1 et 2 au choix de l'hôte.
- [x] Genre demandé à l'inscription : les énoncés s'accordent (il/elle, gêné/gênée).
