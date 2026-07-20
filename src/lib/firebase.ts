import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth, OAuthProvider } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaV3Provider, getToken, type AppCheck } from 'firebase/app-check'

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

export let appCheck: AppCheck | null = null
if (import.meta.env.PROD) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Letu9MsAAAAANUTDPt0LiCx_czyUxle648WwvfM'),
    isTokenAutoRefreshEnabled: true,
  })
}
export { getToken as getAppCheckToken }

export const db = initializeFirestore(app, {})
export const storage = getStorage(app)
export const auth = getAuth(app)
export const microsoftProvider = new OAuthProvider('microsoft.com')
