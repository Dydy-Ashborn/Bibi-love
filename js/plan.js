/* Bibi Love — point de contrôle unique du plan (gratuit / complet).
 *
 * Toute limitation passe par `guard()` : aucune vérification de plan ailleurs dans
 * le code. Ajouter une restriction = ajouter une entrée ici, pas un `if` dans une vue.
 *
 * Choix de découpage : on ne verrouille PAS un thème isolé. Un couple qui joue en
 * famille ne paierait jamais pour débloquer « Intime » — il faut que la limite le
 * touche aussi. C'est donc la taille de la banque, la durée des parties et le nombre
 * de couples qui sont bridés : tout le monde finit par buter dessus, quel que soit
 * le ton choisi.
 */
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { db, uid } from './firebase.js';

export const PRIX = '4,99 €';

/** URL Stripe Payment Link. À renseigner au déploiement. */
export const LIEN_PAIEMENT = '';

export const GRATUIT = {
  spices: [1, 2],            // Familial et Gênant seulement
  durations: [30],           // 3 questions par manche
  maxCouples: 2,
  questionsParNiveau: 30,    // 60 questions tirables au total
  customParJoueur: 3,        // questions perso écrites par personne
  historique: 2
};

export const COMPLET = { customParJoueur: 12 };

const LS = 'bibi.premium';
let cache = localStorage.getItem(LS) === '1';

export function isPremium() { return cache; }

/** Diagnostic de la dernière lecture : alimente l'écran « Mon compte ». */
let dernierDiag = { etat: 'jamais', message: '' };
export function diagPremium() { return dernierDiag; }

/**
 * Relit le statut depuis Firestore (`hosts/{uid}.premium`).
 * Ce document est écrit par le webhook Stripe (ou à la main par le propriétaire) ;
 * le localStorage n'est qu'un cache de confort, jamais la source de vérité.
 *
 * L'erreur n'est PLUS avalée en silence : un `catch {}` vide laissait l'utilisateur
 * face à un « version gratuite » inexplicable alors que le document existait — la
 * cause réelle étant presque toujours des règles Firestore non déployées, qui
 * refusent la lecture de `hosts/{uid}`.
 */
export async function refreshPremium() {
  try {
    const snap = await getDoc(doc(db, 'hosts', uid()));
    const brut = snap.exists() ? snap.data().premium : undefined;
    // Comparaison stricte : `premium: "true"` saisi en *chaîne* dans la console Firebase
    // passait pour vrai avec un simple `!!`. On exige le booléen, et on le dit.
    cache = brut === true;
    if (!snap.exists()) {
      dernierDiag = { etat: 'absent',
        message: "Aucun document hosts/ à cet identifiant. Vérifie que l'ID du document est exactement celui affiché ci-dessus." };
    } else if (cache) {
      dernierDiag = { etat: 'ok', message: '' };
    } else if (typeof brut === 'string') {
      dernierDiag = { etat: 'mauvais-type',
        message: `Le champ premium vaut la chaîne « ${brut} », pas le booléen true. Dans la console Firebase, choisis le type « booléen » et non « chaîne ».` };
    } else {
      dernierDiag = { etat: 'sans-premium',
        message: "Le document existe mais son champ premium n'est pas à true (type booléen attendu)." };
    }
  } catch (e) {
    dernierDiag = { etat: 'refus', message: 'Lecture refusée par Firestore : ' + (e.code || e.message) +
      ". Le plus souvent, les règles de sécurité n'ont pas encore été déployées (firebase deploy --only firestore:rules)." };
    console.warn('[bibi] lecture de hosts/' + uid() + ' impossible :', e);
  }
  localStorage.setItem(LS, cache ? '1' : '0');
  return cache;
}

/** Débloquage local (retour de paiement, ou déblocage manuel pendant les tests). */
export function setPremiumLocal(on) {
  cache = !!on;
  localStorage.setItem(LS, cache ? '1' : '0');
}

/**
 * Point de contrôle unique.
 * @returns {{ok:boolean, why?:string}} `why` est le texte affiché dans le paywall.
 */
export function guard(feature, value) {
  if (cache) return { ok: true };
  switch (feature) {
    case 'spice':
      return GRATUIT.spices.includes(Number(value))
        ? { ok: true }
        : { ok: false, why: "Les tons Intime et Sans filtre font partie de la version complète." };
    case 'duration':
      return GRATUIT.durations.includes(Number(value))
        ? { ok: true }
        : { ok: false, why: "Les parties de 45 minutes et d'une heure font partie de la version complète." };
    case 'custom':
      return Number(value) <= GRATUIT.customParJoueur
        ? { ok: true }
        : { ok: false, why: `La version gratuite permet ${GRATUIT.customParJoueur} questions personnalisées par personne. La version complète en permet ${COMPLET.customParJoueur}.` };
    case 'couples':
      return Number(value) <= GRATUIT.maxCouples
        ? { ok: true }
        : { ok: false, why: `La version gratuite va jusqu'à ${GRATUIT.maxCouples} couples. Au-delà, c'est la version complète.` };
    default:
      return { ok: true };
  }
}

/**
 * Restreint le pool de questions en version gratuite.
 * Découpe déterministe : les N premières de chaque niveau. Deux parties successives
 * piochent donc dans le même sous-ensemble — c'est voulu, c'est la limite qui se
 * fait sentir au bout de deux ou trois soirées.
 */
export function limitePool(pool) {
  if (cache) return pool;
  const parNiveau = {};
  return pool.filter(q => {
    parNiveau[q.s] = (parNiveau[q.s] || 0) + 1;
    return parNiveau[q.s] <= GRATUIT.questionsParNiveau;
  });
}

/** Nombre maximum de questions perso autorisé par le plan courant. */
export function maxCustom() {
  return cache ? COMPLET.customParJoueur : GRATUIT.customParJoueur;
}

/** Résumé affiché dans le bandeau de l'écran de création. */
export function resume() {
  if (cache) {
    return { titre: 'Version complète', ligne: '377 questions, tous les tons, jusqu\'à 4 couples.' };
  }
  return {
    titre: 'Version gratuite',
    ligne: `60 questions · parties de 30 min · 2 couples max.`
  };
}
