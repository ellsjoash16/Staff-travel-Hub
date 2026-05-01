import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth, OAuthProvider } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}
const app = initializeApp(firebaseConfig)
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Letu9MsAAAAANUTDPt0LiCx_czyUxle648WwvfM'),
  isTokenAutoRefreshEnabled: true,
})
// experimentalAutoDetectLongPolling: falls back from WebChannel to HTTP polling
// when the environment blocks streaming connections (e.g. some CDN/proxy setups)
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
})
export const storage = getStorage(app)
export const auth = getAuth(app)
export const microsoftProvider = new OAuthProvider('microsoft.com')
