# Bibi Love

PWA de jeu de couples inspirée des jeux télé de complicité conjugale : **les joueurs
répondent en amont, chacun de son côté**, puis l'animateur lance la partie sur un
écran maître et le conjoint doit deviner. Trois manches, une finale chronométrée.

- **Stack** : HTML/CSS/JS vanilla (modules ES), aucune dépendance de build.
- **Backend** : Firebase — Firestore + Auth anonyme + Hosting. Pas de Cloud Functions.
- **Offline** : service worker (coque uniquement, jamais les données Firestore).

## Démarrage

```bash
npm i -g firebase-tools      # une seule fois
firebase login
firebase deploy --only firestore:rules,hosting
```

Le lien à envoyer aux joueurs : `https://<projet>.web.app/#/j/CODE`.

## Prérequis côté console Firebase

1. **Authentication → Sign-in method → Anonyme** : activé (sans ça, rien ne démarre).
2. **Firestore** créé en région `eur3` ou `europe-west1` (choix irréversible).
3. **Hosting** initialisé sur le projet `bibi-5a5a1`.

## Documentation

L'état du projet vit dans les fichiers `map-*.md`, pas dans l'historique de chat.
Commencer par [`map-index.md`](map-index.md).
