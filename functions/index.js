/* Bibi Love — webhook Stripe.
 *
 * Unique fonction serveur du projet. Elle existe parce qu'un paiement ne peut pas
 * être vérifié côté navigateur : les règles Firestore interdisent d'écrire
 * `hosts/{uid}` depuis le client, et l'Admin SDK utilisé ici les contourne.
 *
 * Déploiement :
 *   cd functions && npm install
 *   firebase deploy --only functions
 * Puis dans Stripe → Développeurs → Webhooks, pointer l'URL de la fonction sur
 * l'événement `checkout.session.completed` et coller le secret dans functions/.env.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const STRIPE_SECRET  = defineSecret('STRIPE_SECRET_KEY');
const WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

admin.initializeApp();

exports.stripeWebhook = onRequest(
  { region: 'europe-west1', secrets: [STRIPE_SECRET, WEBHOOK_SECRET], cors: false },
  async (req, res) => {
    const stripe = require('stripe')(STRIPE_SECRET.value());

    let event;
    try {
      // `req.rawBody` est indispensable : la signature porte sur les octets bruts.
      // Utiliser `req.body` (déjà parsé en JSON) fait échouer la vérification à tous
      // les coups, et c'est le piège numéro un de cette intégration.
      event = stripe.webhooks.constructEvent(
        req.rawBody, req.headers['stripe-signature'], WEBHOOK_SECRET.value());
    } catch (err) {
      console.error('Signature Stripe invalide :', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type !== 'checkout.session.completed') {
      return res.status(200).send('ignoré');       // 200 : sinon Stripe réessaie en boucle
    }

    const session = event.data.object;
    const uid = session.client_reference_id;
    if (!uid) {
      // Paiement encaissé sans identité : on le trace, sans jamais rejeter l'événement.
      console.error('Paiement sans client_reference_id, session', session.id);
      return res.status(200).send('sans identité');
    }
    if (session.payment_status !== 'paid') {
      return res.status(200).send('non payé');
    }

    try {
      await admin.firestore().doc(`hosts/${uid}`).set({
        premium: true,
        achatLe: admin.firestore.FieldValue.serverTimestamp(),
        stripeSessionId: session.id,
        email: session.customer_details ? session.customer_details.email : null,
        montant: session.amount_total,
        devise: session.currency
      }, { merge: true });
      console.log('Premium accordé à', uid);
      return res.status(200).send('ok');
    } catch (err) {
      // On renvoie 500 pour que Stripe REJOUE l'événement : sans ça, une panne
      // Firestore passagère ferait perdre définitivement un achat déjà encaissé.
      console.error('Écriture Firestore impossible pour', uid, err);
      return res.status(500).send('retry');
    }
  }
);
