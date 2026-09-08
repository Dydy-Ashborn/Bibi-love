/* Bibi Love — configuration Firebase.
 * Ces clés sont publiques par nature (SDK web) : la sécurité réelle est dans firestore.rules. */
export const firebaseConfig = {
  apiKey: "AIzaSyAu1XJDptLkwMWD7aVxb5UTnWUJTLtFw5o",
  authDomain: "bibi-5a5a1.firebaseapp.com",
  projectId: "bibi-5a5a1",
  storageBucket: "bibi-5a5a1.firebasestorage.app",
  messagingSenderId: "790447586151",
  appId: "1:790447586151:web:ceca0e1c0b938fd70a0dc2"
};

/* Réglages de jeu globaux */
export const RULES = {
  POINTS_ROUND_1_2: 10,
  POINTS_BONUS: 25,
  FINAL_QUESTIONS: 7,
  FINAL_SECONDS: 45,
  FINAL_MAX_ERRORS: 3,          // 4 erreurs = défaite → on perd à partir de la 4e
  QUESTIONS_PER_ROUND: { 30: 3, 45: 4, 60: 5 },
  MAX_COUPLES: 4
};
