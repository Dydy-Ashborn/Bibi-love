const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { validUid, validPurchase } = require('./index')._test;

const session = overrides => ({
  mode: 'payment',
  payment_status: 'paid',
  amount_total: 499,
  currency: 'eur',
  payment_link: 'plink_bibi',
  ...overrides
});

test('validUid accepte un uid Firebase et refuse un chemin', () => {
  assert.equal(validUid('abcdefghijklmnopqrstuvwx1234'), true);
  assert.equal(validUid('../../hosts/another-user'), false);
  assert.equal(validUid('trop-court'), false);
});

test('validPurchase exige le produit payé attendu', () => {
  assert.equal(validPurchase(session()), true);
  assert.equal(validPurchase(session({ mode: 'subscription' })), false);
  assert.equal(validPurchase(session({ payment_status: 'unpaid' })), false);
  assert.equal(validPurchase(session({ amount_total: 99 })), false);
  assert.equal(validPurchase(session({ currency: 'usd' })), false);
});

test('validPurchase vérifie le Payment Link quand il est configuré', () => {
  const previous = process.env.STRIPE_PAYMENT_LINK_ID;
  process.env.STRIPE_PAYMENT_LINK_ID = 'plink_bibi';
  try {
    assert.equal(validPurchase(session()), true);
    assert.equal(validPurchase(session({ payment_link: 'plink_other' })), false);
  } finally {
    if (previous === undefined) delete process.env.STRIPE_PAYMENT_LINK_ID;
    else process.env.STRIPE_PAYMENT_LINK_ID = previous;
  }
});

test('le prix public reste synchronisé avec le webhook', () => {
  const plan = fs.readFileSync(path.join(__dirname, '..', 'js', 'plan.js'), 'utf8');
  assert.match(plan, /export const PRIX = '4,99 €'/);
});
