import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth, OAuthProvider } from 'firebase/auth'
// import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const e = (k: string) => (import.meta.env[k] as string ?? '').trim()
const firebaseConfig = {
  apiKey: e('VITE_FIREBASE_API_KEY'),
  authDomain: e('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: e('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: e('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: e('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: e('VITE_FIREBASE_APP_ID'),
}
const app = initializeApp(firebaseConfig)
// App Check temporarily disabled pending reCAPTCHA domain configuration
// if (import.meta.env.PROD) {
//   initializeAppCheck(app, {
//     provider: new ReCaptchaV3Provider('6Letu9MsAAAAANUTDPt0LiCx_czyUxle648WwvfM'),
//     isTokenAutoRefreshEnabled: true,
//   })
// }
// experimentalAutoDetectLongPolling: falls back from WebChannel to HTTP polling
// when the environment blocks streaming connections (e.g. some CDN/proxy setups)
// experimentalAutoDetectLongPolling: falls back to HTTP long-polling when the
// environment blocks WebChannel streaming (e.g. Vercel's CDN edge network).
// Safe to use now that all admin writes go through the serverless API instead
// of the Firestore SDK — the original write-queuing issue no longer applies.
export const db = initializeFirestore(app, {})
export const storage = getStorage(app)
export const auth = getAuth(app)
export const microsoftProvider = new OAuthProvider('microsoft.com')
