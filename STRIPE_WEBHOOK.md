# Webhook Stripe — mise en production

Le code est dans `functions/index.js`. Il débloque `hosts/{uid}.premium` uniquement pour
un paiement unique de **4,99 EUR** signé par Stripe. Les événements sont traités dans une
transaction Firestore et dédupliqués dans `stripeCheckoutSessions/{sessionId}`.

## 1. Vérifier le Payment Link

Dans Stripe, le Payment Link doit être en mode paiement unique, à 4,99 EUR. Configurer :

- URL de succès : `https://VOTRE-DOMAINE/#/?paiement=ok` ;
- collecte de l'adresse e-mail ;
- acceptation obligatoire des conditions de service, avec l'URL publique `#/cgv` ;
- texte d'acceptation rappelant l'accès immédiat au contenu numérique et la perte du
  droit de rétractation après activation.

Relever l'identifiant API du lien (`plink_…`, différent de l'URL `buy.stripe.com`). Dans
`functions/.env`, ajouter sans toucher aux secrets existants :

```dotenv
STRIPE_PAYMENT_LINK_ID=plink_xxxxxxxxxxxxx
```

Cette vérification optionnelle devient active dès que la valeur est renseignée. Le
montant, la devise, le mode et le statut de paiement sont toujours vérifiés côté serveur.

## 2. Enregistrer les secrets Firebase

Depuis la racine du projet :

```sh
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

La première commande reçoit la clé Stripe `sk_live_…`. Pour la seconde, commencer par
créer le webhook afin d'obtenir son secret `whsec_…`.

## 3. Déployer puis créer le webhook

```sh
npm install --prefix functions
firebase deploy --only functions:stripeWebhook
```

Dans Stripe Workbench → Webhooks, créer une destination HTTPS vers :

```text
https://europe-west1-bibi-5a5a1.cloudfunctions.net/stripeWebhook
```

Écouter exactement ces événements :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copier ensuite le secret de signature de cette destination avec la commande de l'étape 2
et redéployer la fonction. Le secret d'un webhook local Stripe CLI n'est pas celui du
webhook de production.

## 4. Tester avant le mode réel

1. Créer une destination équivalente en mode test et utiliser les clés de test.
2. Ouvrir l'app, noter l'identifiant dans « Mon compte », puis acheter avec une carte de test.
3. Vérifier dans Firestore que `hosts/{uid}.premium` vaut le booléen `true` et qu'un reçu
   existe dans `stripeCheckoutSessions`.
4. Rejouer l'événement depuis Stripe : la réponse doit être `duplicate` et ne pas créer
   de second déblocage.
5. Vérifier les journaux :

```sh
firebase functions:log --only stripeWebhook
```

## Points à garder synchronisés

Si le prix change, modifier ensemble `PRIX` dans `js/plan.js`, `PRODUCT.amount` dans
`functions/index.js`, le Payment Link Stripe et les CGV. Avant l'ouverture commerciale,
compléter aussi toutes les valeurs de `js/legal.js` et faire valider les documents par un
professionnel du droit.
