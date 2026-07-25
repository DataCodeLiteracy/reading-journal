import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth"

const FOCUS_LEVEL_APP_NAME = "focus-level"

function focusLevelFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FOCUS_LEVEL_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FOCUS_LEVEL_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FOCUS_LEVEL_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FOCUS_LEVEL_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FOCUS_LEVEL_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FOCUS_LEVEL_APP_ID,
  }
}

export function isFocusLevelAuthConfigured(): boolean {
  const c = focusLevelFirebaseConfig()
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId)
}

function getFocusLevelApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === FOCUS_LEVEL_APP_NAME)
  if (existing) return existing
  const config = focusLevelFirebaseConfig()
  if (!config.apiKey || !config.projectId) {
    throw new Error(
      "focus-level Firebase 공개 설정(NEXT_PUBLIC_FOCUS_LEVEL_*)이 없습니다.",
    )
  }
  return initializeApp(config, FOCUS_LEVEL_APP_NAME)
}

export function getFocusLevelAuth(): Auth {
  return getAuth(getFocusLevelApp())
}

const focusLevelGoogleProvider = new GoogleAuthProvider()

export async function signInFocusLevelWithGoogle(): Promise<{
  user: User
  idToken: string
}> {
  const auth = getFocusLevelAuth()
  const cred = await signInWithPopup(auth, focusLevelGoogleProvider)
  const idToken = await cred.user.getIdToken()
  return { user: cred.user, idToken }
}

export async function getFocusLevelIdToken(
  forceRefresh = false,
): Promise<string | null> {
  const user = getFocusLevelAuth().currentUser
  if (!user) return null
  return user.getIdToken(forceRefresh)
}

export async function signOutFocusLevel(): Promise<void> {
  await signOut(getFocusLevelAuth())
}
