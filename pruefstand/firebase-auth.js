/* Prüfstand-Ersatz für firebase-auth.js.
   Meldet sofort einen angemeldeten Nutzer, damit das Login-Gate aufgeht
   und die Bereiche gezeichnet werden. */

const NUTZER = {
  uid: 'pruefstand-uid',
  email: 'vladi@example.de',
  displayName: 'Vladi',
  providerData: [{ providerId: 'password' }],
};

let AUTH = null;

export function getAuth(){
  if(!AUTH) AUTH = { currentUser: NUTZER, app: null };
  return AUTH;
}

export function onAuthStateChanged(auth, cb){
  auth.currentUser = NUTZER;
  // Ein Tick Verzögerung, damit der Rest des Moduls fertig ausgewertet ist.
  Promise.resolve().then(()=>cb(NUTZER));
  return ()=>{};
}

const nichts = ()=>Promise.resolve();
export const signOut = nichts;
export const createUserWithEmailAndPassword = ()=>Promise.resolve({ user: NUTZER });
export const signInWithEmailAndPassword = ()=>Promise.resolve({ user: NUTZER });
export const sendPasswordResetEmail = nichts;
export const signInWithRedirect = nichts;
export const getRedirectResult = ()=>Promise.resolve(null);
/* Wie live: displayName bleibt am Konto haengen - der Wahlschritt (E2)
   schreibt ihn, members-Eintraege und Anfragen lesen ihn danach. */
export const updateProfile = (nutzer, daten)=>{ Object.assign(NUTZER, daten || {}); return Promise.resolve(); };
export const updateEmail = nichts;
export const updatePassword = nichts;
export const linkWithCredential = nichts;
export class GoogleAuthProvider {}
export const EmailAuthProvider = { credential: ()=>({}) };
