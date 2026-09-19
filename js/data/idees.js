/* Bibi Love — boîte à idées du composeur de questions personnalisées.
 * Ces amorces ne sont pas des questions toutes faites : elles servent à débloquer
 * quelqu'un devant une page blanche. Elles sont volontairement incomplètes et
 * ancrées dans le vécu du couple — c'est là que les questions perso battent
 * n'importe quelle banque générique.
 */
export const IDEES = [
  { t: 'Vos débuts',  q: "Qu'est-ce que je portais le soir de notre rencontre ?" },
  { t: 'Vos débuts',  q: "Quelle phrase je t'ai dite en premier ?" },
  { t: 'Vos débuts',  q: "Combien de temps j'ai attendu avant de parler de toi à ma mère ?" },
  { t: 'Vos débuts',  q: "Qu'est-ce qui t'a fait dire oui pour un deuxième rendez-vous ?" },
  { t: 'Vos débuts',  q: "Quel surnom je te donnais au tout début ?" },
  { t: 'Quotidien',   q: "Qu'est-ce que je commande systématiquement chez notre livreur préféré ?" },
  { t: 'Quotidien',   q: "Quelle est la chose que je range toujours mal selon toi ?" },
  { t: 'Quotidien',   q: "Quelle série j'ai regardée en avance sans t'attendre ?" },
  { t: 'Quotidien',   q: "Combien de temps je mets vraiment pour être prêt(e) ?" },
  { t: 'Quotidien',   q: "Quel est le dernier truc que j'ai acheté sans te le dire ?" },
  { t: 'Quotidien',   q: "Qu'est-ce que je fais en premier le dimanche matin ?" },
  { t: 'Nos gens',    q: "Lequel de mes amis tu supportes le moins ?" },
  { t: 'Nos gens',    q: "Qui dans ma famille t'a le plus surpris ?" },
  { t: 'Nos gens',    q: "Qui de nos amis nous voyait ensemble en premier ?" },
  { t: 'Nos gens',    q: "À qui je raconte nos disputes ?" },
  { t: 'Voyages',     q: "Quel voyage je veux refaire en priorité ?" },
  { t: 'Voyages',     q: "Dans quelle ville j'ai eu le plus envie de vivre ?" },
  { t: 'Voyages',     q: "Qu'est-ce que j'oublie systématiquement dans ma valise ?" },
  { t: 'Voyages',     q: "Quelle a été la pire nuit de nos vacances ?" },
  { t: 'Manies',      q: "Quel est mon tic quand je mens ?" },
  { t: 'Manies',      q: "Qu'est-ce que je fais quand je suis stressé(e) ?" },
  { t: 'Manies',      q: "Quelle est ma manie qui t'agace le plus ?" },
  { t: 'Manies',      q: "Qu'est-ce que je répète tout le temps sans m'en rendre compte ?" },
  { t: 'Manies',      q: "Sur quoi je suis complètement irrationnel(le) ?" },
  { t: 'Projets',     q: "Où je nous vois habiter dans cinq ans ?" },
  { t: 'Projets',     q: "Quel est le projet dont je parle sans jamais le lancer ?" },
  { t: 'Projets',     q: "Qu'est-ce que je ferais si je gagnais assez pour arrêter de travailler ?" },
  { t: 'Projets',     q: "Quel animal je voudrais adopter en secret ?" },
  { t: 'Souvenirs',   q: "Quel est mon meilleur souvenir de nous deux ?" },
  { t: 'Souvenirs',   q: "Quelle dispute je n'ai jamais complètement digérée ?" },
  { t: 'Souvenirs',   q: "Quel cadeau de toi m'a le plus touché(e) ?" },
  { t: 'Souvenirs',   q: "Quel moment de notre histoire je raconte toujours de travers ?" },
  { t: 'Piquant',     q: "Qu'est-ce que je n'ose pas te demander ?" },
  { t: 'Piquant',     q: "Quel est le mensonge que je te sors le plus souvent ?" },
  { t: 'Piquant',     q: "Qu'est-ce que je changerais chez toi si je pouvais ?" },
  { t: 'Piquant',     q: "Qu'est-ce que je n'ai jamais avoué à ta famille ?" },
  { t: 'Piquant',     q: "Sur quoi je te trouve insupportable mais je me tais ?" },
  { t: 'Nous deux',   q: "Quelle chanson me fait penser à nous ?" },
  { t: 'Nous deux',   q: "Quel film je ne me lasserai jamais de regarder avec toi ?" },
  { t: 'Nous deux',   q: "Qu'est-ce qui me manque le plus quand tu n'es pas là ?" },
  { t: 'Nous deux',   q: "Quel est notre meilleur plan un dimanche pluvieux ?" },
  { t: 'Nous deux',   q: "Qu'est-ce que je préfère chez toi et que je ne dis jamais ?" }
];

/** Tire `n` idées au hasard, sans doublon. */
export function tirerIdees(n = 3) {
  const copie = IDEES.slice();
  const out = [];
  while (out.length < n && copie.length) {
    out.push(copie.splice(Math.floor(Math.random() * copie.length), 1)[0]);
  }
  return out;
}
