/* Coordonnées contractuelles à compléter avant la mise en production.
 * Ne jamais inventer ces informations : elles doivent correspondre à l'entité qui
 * encaisse réellement les paiements Stripe et au médiateur auquel elle a adhéré. */
export const LEGAL = Object.freeze({
  sellerName: 'À compléter',
  legalForm: 'forme juridique à compléter',
  address: 'adresse postale à compléter',
  registration: 'SIREN / SIRET à compléter',
  email: 'e-mail de contact à compléter',
  phone: 'téléphone à compléter',
  mediator: 'nom, adresse et site du médiateur de la consommation à compléter',
  retention: 'durée des parties à compléter ; justificatifs d’achat conservés selon les délais légaux'
});

const REQUIRED = ['sellerName', 'legalForm', 'address', 'registration', 'email', 'phone', 'mediator', 'retention'];

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

  const ready = REQUIRED.every(key => {
    const value = LEGAL[key];
    return value && !/compl[ée]ter/i.test(value);
  });
  root.querySelectorAll('[data-legal-warning]').forEach(node => { node.hidden = ready; });
}
