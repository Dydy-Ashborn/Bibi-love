/* Bibi Love — webhook Stripe.
 *
 * Déploiement et configuration : voir ../STRIPE_WEBHOOK.md.
 * Cette fonction est la seule autorisée à écrire le statut premium d'un hôte.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const STRIPE_SECRET = defineSecret('STRIPE_SECRET_KEY');
const WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

const PRODUCT = Object.freeze({ amount: 499, currency: 'eur' });
const PAID_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded'
]);

admin.initializeApp();

/** Un uid Firebase ne doit jamais pouvoir devenir un chemin Firestore arbitraire. */
function validUid(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(value);
}

/** Refuse qu'un autre produit Stripe à 4,99 € (ou un abonnement) ouvre Bibi Love. */
function validPurchase(session) {
  const expectedLink = process.env.STRIPE_PAYMENT_LINK_ID;
  return session.mode === 'payment'
    && session.payment_status === 'paid'
    && session.amount_total === PRODUCT.amount
    && session.currency === PRODUCT.currency
    && (!expectedLink || session.payment_link === expectedLink);
}

exports.stripeWebhook = onRequest(
  {
    region: 'europe-west1',
    secrets: [STRIPE_SECRET, WEBHOOK_SECRET],
    cors: false,
    timeoutSeconds: 30
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.set('Allow', 'POST');
      return res.status(405).send('method not allowed');
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).send('missing signature');

    let event;
    try {
      const stripe = require('stripe')(STRIPE_SECRET.value());
      // La signature porte sur les octets bruts : ne jamais remplacer rawBody par body.
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        WEBHOOK_SECRET.value()
      );
    } catch (err) {
      console.error('Signature Stripe invalide :', err.message);
      return res.status(400).send('invalid signature');
    }

    if (!PAID_EVENTS.has(event.type)) return res.status(200).send('ignored');

    const session = event.data.object;
    const uid = session.client_reference_id;
    if (!validUid(uid)) {
      console.error('Paiement sans client_reference_id valide, session', session.id);
      return res.status(200).send('invalid customer reference');
    }
    if (!validPurchase(session)) {
      console.error('Achat inattendu refusé', {
        sessionId: session.id,
        mode: session.mode,
        paymentStatus: session.payment_status,
        amount: session.amount_total,
        currency: session.currency,
        paymentLink: session.payment_link
      });
      return res.status(200).send('unexpected purchase');
    }

    const db = admin.firestore();
    // Une même session peut produire `completed` puis `async_payment_succeeded` : la
    // session, et pas seulement l'événement, est donc la bonne clé d'idempotence.
    const eventRef = db.doc(`stripeCheckoutSessions/${session.id}`);
    const hostRef = db.doc(`hosts/${uid}`);

    try {
      // Stripe peut livrer le même événement plusieurs fois. Le reçu d'événement et
      // le déblocage sont écrits dans la même transaction pour rester atomiques.
      const duplicate = await db.runTransaction(async transaction => {
        const handled = await transaction.get(eventRef);
        if (handled.exists) return true;

        transaction.set(hostRef, {
          premium: true,
          achatLe: admin.firestore.FieldValue.serverTimestamp(),
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent || null,
          email: session.customer_details?.email || null,
          montant: session.amount_total,
          devise: session.currency
        }, { merge: true });
        transaction.create(eventRef, {
          eventId: event.id,
          type: event.type,
          sessionId: session.id,
          hostUid: uid,
          traiteLe: admin.firestore.FieldValue.serverTimestamp()
        });
        return false;
      });

      console.log(duplicate ? 'Événement déjà traité' : 'Premium accordé', {
        eventId: event.id,
        sessionId: session.id,
        hostUid: uid
      });
      return res.status(200).send(duplicate ? 'duplicate' : 'ok');
    } catch (err) {
      // Un 5xx demande à Stripe de rejouer l'événement après une panne transitoire.
      console.error('Traitement Stripe impossible', {
        eventId: event.id,
        sessionId: session.id,
        hostUid: uid,
        error: err.message
      });
      return res.status(500).send('retry');
    }
  }
);

// Exportées pour les tests unitaires sans exposer de route supplémentaire.
exports._test = { validUid, validPurchase };
