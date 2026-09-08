# map-index — Bibi Love

Aiguillage global. Aucun détail comportemental ici : voir les maps spécialisées.

| Module | Fichier(s) | Map | Statut |
|---|---|---|---|
| Coque PWA, routeur, boot | `index.html`, `js/app.js`, `sw.js`, `manifest.webmanifest` | [map-front](map-front.md) | ✅ v1 |
| Direction artistique | `css/style.css`, `icons/` | [map-front](map-front.md) | ✅ v1 |
| Parcours hôte (création → plateau → podium) | `js/host.js` | [map-front](map-front.md) | ✅ v1 |
| Parcours joueur (rejoindre → questionnaire) | `js/player.js` | [map-front](map-front.md) | ✅ v1 |
| Logique de jeu pure | `js/game.js`, `js/config.js` | [map-front](map-front.md) | ✅ v1 |
| Accès Firestore + mémoire locale hôte | `js/store.js`, `js/firebase.js` | [map-donnees](map-donnees.md) | ✅ v1 |
| Banque de questions | `js/data/questions.js` | [map-donnees](map-donnees.md) | ✅ 127 questions |
| Règles de sécurité | `firestore.rules` | [map-donnees](map-donnees.md) | ✅ v1 |

## Chantiers ouverts

- [ ] Déploiement réel : `firebase deploy` non encore lancé (auth anonyme à activer d'abord).
- [ ] Manette téléphone : faire deviner depuis le mobile du conjoint plutôt que sur l'écran maître (voir `decisions.md`).
- [ ] Étoffer la banque : 127 questions aujourd'hui, viser 250 pour enchaîner 5+ soirées sans répétition.
- [ ] Reprise de partie en cours : si l'hôte recharge pendant le live, les scores repartent à zéro.
