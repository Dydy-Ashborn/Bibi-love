/* Bibi Love — moteur de punchlines.
 * Le ton est la signature du jeu : on charrie franchement les derniers, on encense
 * sans retenue les premiers. Tout le texte affiché après une réponse ou sur le podium
 * vient d'ici — jamais de phrase écrite en dur dans le rendu.
 */

/** Bonne réponse. */
export const REACT_GOOD = [
  "Dans le mille.",
  "Ça, c'est de la lecture de pensée.",
  "Vous êtes flippants de complicité.",
  "Aucune hésitation. Le respect.",
  "Bien joué, vous vous écoutez vraiment.",
  "Réponse parfaite. La salle est jalouse.",
  "Là, c'est de l'amour vrai.",
  "Trop facile pour vous.",
  "Vous avez révisé ou quoi ?",
  "Impeccable. Continuez comme ça.",
  "Le genre de réponse qui sauve une soirée.",
  "Vous méritez votre place ensemble."
];

/** Mauvaise réponse. */
export const REACT_BAD = [
  "Alors non. Pas du tout.",
  "Aïe. Ça va se discuter dans la voiture.",
  "Vous vivez ensemble depuis combien de temps déjà ?",
  "Même un inconnu aurait mieux répondu.",
  "Grosse erreur judiciaire.",
  "Personne n'a rien vu. On continue.",
  "Ça pique. On enchaîne.",
  "Zéro pointé, et un froid dans la pièce.",
  "Il va falloir parler, tous les deux.",
  "Loupé. Et l'autre a bien noté, hein.",
  "C'est le genre de moment qui finit en débat.",
  "Non. Et le silence est très parlant.",
  "Vous vous connaissez sur le papier, quoi.",
  "Raté. Regardez-vous dans les yeux, là."
];

/** Réaction quand le répondant n'avait rien rempli en amont. */
export const REACT_VIDE = [
  "Rien de rempli. Le vrai perdant, c'est l'organisation.",
  "Pas de réponse enregistrée. Bravo la motivation.",
  "Aucune réponse en amont. Question offerte à personne."
];

/**
 * Commentaires de fin de partie en mode Tournoi, selon la place du couple.
 * `first` : on encense. `middle` : on relativise. `last` : on charrie.
 */
export const PODIUM = {
  first: [
    "Faits l'un pour l'autre. C'est presque insupportable.",
    "Âmes sœurs officielles. Le reste de la salle peut rentrer.",
    "Vous ne trichez pas ? Parce que là, ça devient suspect.",
    "Le couple que tout le monde déteste secrètement. Bravo.",
    "Une seule personne dans deux corps. Magnifique et légèrement inquiétant.",
    "Vous n'avez rien à prouver. Vous venez quand même de tout prouver."
  ],
  middle: [
    "Solide, sans plus. Le podium vous a vus passer.",
    "Vous vous connaissez bien. Juste pas assez pour gagner.",
    "Deuxième, c'est le premier des perdants. Bonne soirée.",
    "Honnête. Personne ne se souviendra de vous, mais honnête.",
    "Vous avez fait le travail minimum syndical de l'amour."
  ],
  last: [
    "Vous êtes sûrs d'être ensemble ? Genre vraiment sûrs ?",
    "Aïe aïe aïe. Ça va s'engueuler au retour.",
    "Deux colocataires très polis, en fait.",
    "Bonne nouvelle : vous allez apprendre plein de choses ce soir.",
    "Le début d'une longue conversation. Courage.",
    "Vous venez de découvrir votre partenaire en direct. Félicitations ?",
    "À ce niveau-là, ce n'est plus un couple, c'est une rencontre.",
    "Dernier. Et honnêtement, c'était mérité."
  ]
};

/**
 * Rangs du mode Duo, du pire au meilleur.
 * `min` = ratio de bonnes réponses à atteindre. Trié décroissant à l'usage.
 */
export const RANKS = [
  { min: 0.90, title: 'Âmes sœurs', icon: 'heart-circle-check',
    lines: [
      "Vous êtes la même personne dans deux corps. C'est beau et c'est flippant.",
      "À ce stade, ce n'est plus de la complicité, c'est de la télépathie.",
      "Personne ne devrait se connaître aussi bien. Vous nous mettez tous mal à l'aise."
    ] },
  { min: 0.70, title: 'Complices', icon: 'fire-flame-curved',
    lines: [
      "Vous vous connaissez par cœur, à deux ou trois détails près.",
      "Du très haut niveau. Il reste juste un ou deux dossiers à ouvrir.",
      "Presque parfait. Le presque va vous occuper toute la soirée."
    ] },
  { min: 0.50, title: 'Bien assortis', icon: 'heart',
    lines: [
      "Solide. Il reste quelques zones d'ombre, et elles sont intéressantes.",
      "Vous êtes un bon couple. Un bon couple avec des secrets.",
      "La moitié juste. L'autre moitié, c'est le sujet du dîner."
    ] },
  { min: 0.30, title: 'En rodage', icon: 'hand-holding-heart',
    lines: [
      "Ça vient. Prévoyez une deuxième partie et une longue discussion.",
      "Vous êtes au début de quelque chose. Ou à la fin, on ne sait pas encore.",
      "Beaucoup de bonne volonté, peu de résultats. Comme au sport."
    ] },
  { min: 0, title: 'Colocataires', icon: 'face-meh',
    lines: [
      "Vous partagez un appartement. L'amour, on va dire que ça se travaille.",
      "Vous êtes sûrs d'être ensemble ? Genre vraiment sûrs ?",
      "Techniquement en couple. Statistiquement, deux inconnus.",
      "Aïe aïe aïe. Le retour en voiture va être long."
    ] }
];

/** Commentaire affiché sur le téléphone de chaque joueur au récap final. */
export const RECAP_JOUEUR = {
  first:  ["Vous avez gagné. Savourez, ça n'arrivera pas tous les jours.",
           "Champions. Le reste de la salle vous en veut déjà."],
  middle: ["Pas dernier. C'est déjà ça.",
           "Le ventre mou du classement. Confortable, mais sans gloire."],
  last:   ["Dernier. On ne va pas vous mentir, c'était visible dès la manche 1.",
           "Bon. Il y a du travail. Beaucoup de travail."]
};

/** Petites piques affichées pendant que les autres couples jouent. */
export const ATTENTE = [
  "Pendant ce temps, tu peux préparer tes excuses.",
  "Profite, c'est bientôt ton tour.",
  "Regarde l'écran. Et prépare-toi.",
  "Ton tour arrive. Aucune pression."
];

/** Tirage sans répétition immédiate : on évite de resservir la même punchline. */
const derniers = {};
export function pioche(liste, cle = 'default') {
  if (!liste || !liste.length) return '';
  if (liste.length === 1) return liste[0];
  let choix, garde = 0;
  do { choix = liste[Math.floor(Math.random() * liste.length)]; garde++; }
  while (choix === derniers[cle] && garde < 8);
  derniers[cle] = choix;
  return choix;
}

/** Rang de complicité (mode Duo) à partir du ratio de bonnes réponses. */
export function rankFor(ratio) {
  const r = RANKS.find(x => ratio >= x.min) || RANKS[RANKS.length - 1];
  return { title: r.title, icon: r.icon, line: pioche(r.lines, 'rank') };
}

/** Commentaire de podium selon la place (0 = premier) et le nombre de couples. */
export function podiumLine(index, total) {
  if (index === 0) return pioche(PODIUM.first, 'p0');
  if (index === total - 1 && total > 1) return pioche(PODIUM.last, 'pl');
  return pioche(PODIUM.middle, 'pm');
}
