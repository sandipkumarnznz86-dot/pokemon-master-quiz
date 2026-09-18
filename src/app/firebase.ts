import { getAnalytics } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyB_RRtVKtO8sO-Od5O41XCJZrqr3gvWOeY',
  authDomain: 'angular-quiz-ae1ba.firebaseapp.com',
  projectId: 'angular-quiz-ae1ba',
  storageBucket: 'angular-quiz-ae1ba.firebasestorage.app',
  messagingSenderId: '730430504852',
  appId: '1:730430504852:web:653fe042855a78f1ebd981',
  measurementId: 'G-JQ36EE4NWP',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
export const firebaseFunctions = getFunctions(firebaseApp);

let firebaseAnalytics: ReturnType<typeof getAnalytics> | null = null;
try {
  if (typeof window !== 'undefined') {
    firebaseAnalytics = getAnalytics(firebaseApp);
  }
} catch (error) {
  console.warn('[firebase] Analytics unavailable; authentication and database remain active', error);
}

console.info('[firebase] Firebase initialized', {
  projectId: firebaseConfig.projectId,
});

export { firebaseAnalytics };
