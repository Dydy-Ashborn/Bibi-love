/* Coordonnées publiques de l'entité qui encaisse les paiements Stripe. */
export const LEGAL = Object.freeze({
  sellerName: 'DB Digital',
  registration: 'SIRET 102 527 264 00018',
  email: 'dbartisandigital@gmail.com'
});

export function initLegal(root = document) {
  root.querySelectorAll('[data-legal]').forEach(node => {
    const value = LEGAL[node.dataset.legal];
    if (value) node.textContent = value;
  });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(LEGAL.email);
  root.querySelectorAll('[data-legal-link="email"]').forEach(link => {
    if (validEmail) link.href = `mailto:${LEGAL.email}`;
    else {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
    }
  });
}
