/* Bibi Love — contrat de la partie en direct entre l'écran maître et les téléphones.
 *
 * L'hôte publie un « broadcast » dans games/{code}.bc à chaque changement d'état.
 * Champ séparé de `live` : ce dernier est réécrit en bloc par la sauvegarde d'état et
 * emporterait la diffusion avec lui.
 * Les téléphones l'écoutent et se rendent seuls. Le joueur qui doit deviner renvoie
 * son choix dans games/{code}/guesses/{uid}.
 *
 * `seq` est la clé de tout : il s'incrémente à chaque nouvelle question. Un choix qui
 * arrive avec un `seq` périmé (téléphone en retard, double tap, reconnexion) est
 * ignoré côté hôte — sans ça, une réponse à la question précédente marquerait des
 * points sur la suivante.
 */

export const PHASE = {
  ATTENTE:  'attente',   // partie lancée, question pas encore affichée
  QUESTION: 'question',  // question posée, on attend le choix du devineur
  REVEAL:   'reveal',    // réponse révélée
  FINI:     'fini'       // podium
};

/**
 * Construit l'objet publié par l'hôte. Aucune valeur `undefined` : Firestore les refuse.
 *
 * ATTENTION — le doc de partie est lisible par tous les joueurs authentifiés. Rien qui
 * révèle la réponse ne doit figurer dans un broadcast de phase QUESTION : ni `truth`,
 * ni `expected`, ni les libellés. Ces champs ne sont renseignés qu'à la révélation,
 * sinon le téléphone du devineur contient la réponse avant qu'il ne réponde.
 *
 * `kind` vaut 'qcm' (options à toucher) ou 'texte' (réponse libre arbitrée par l'hôte).
 */
export function broadcast({
  seq, phase, kind = 'qcm', round = null, qid = null, coupleId = null, coupleName = null,
  sourceUid = null, sourceName = null, guesserUid = null, guesserName = null,
  sourceGender = null, prompt = null, options = null, perso = false,
  picked = null, truth = null, pickedLabel = null, truthLabel = null,
  given = null, expected = null,
  correct = null, points = 0, scores = null
}) {
  return {
    seq, phase, kind, round, qid, coupleId, coupleName,
    sourceUid, sourceName, guesserUid, guesserName, sourceGender,
    prompt, options, perso,
    picked, truth, pickedLabel, truthLabel, given, expected,
    correct, points,
    scores: scores || {}, at: Date.now()
  };
}

/** Le téléphone de cet uid doit-il afficher les boutons de réponse ? */
export function estMonTour(bc, monUid) {
  return !!bc && bc.phase === PHASE.QUESTION && bc.guesserUid === monUid;
}
