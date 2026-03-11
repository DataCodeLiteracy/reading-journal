"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { User } from "@/types/user"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface AuthContextType {
  user: FirebaseUser | null
  userData: User | null
  loading: boolean
  isLoggedIn: boolean
  userUid: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isLoggedIn: false,
  userUid: null,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userUid, setUserUid] = useState<string | null>(null)

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    const storedUserUid = localStorage.getItem("userUid")

    setIsLoggedIn(storedIsLoggedIn)
    setUserUid(storedUserUid)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        setIsLoggedIn(true)
        setUserUid(firebaseUser.uid)
        localStorage.setItem("isLoggedIn", "true")
        localStorage.setItem("userUid", firebaseUser.uid)

        // Firestore에서 사용자 데이터 가져오기
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const existingData = userDoc.data() as Record<string, unknown>
            // isAdmin: 문서에 명시적으로 true로 저장된 경우만 true, 그 외는 false (필드 없음/undefined 방지)
            const isAdmin = existingData && existingData.isAdmin === true
            const updatedUserData: User = {
              ...existingData,
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? null,
              displayName: firebaseUser.displayName ?? null,
              photoURL: firebaseUser.photoURL ?? null,
              emailVerified: firebaseUser.emailVerified ?? false,
              phoneNumber: firebaseUser.phoneNumber ?? null,
              lastLoginAt: new Date(),
              updated_at: new Date(),
              isAdmin,
            } as User
            setUserData(updatedUserData)
          } else {
            // 사용자 문서가 없으면 기본값으로 생성
            const defaultUserData: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? null,
              displayName: firebaseUser.displayName ?? null,
              photoURL: firebaseUser.photoURL ?? null,
              emailVerified: firebaseUser.emailVerified ?? false,
              phoneNumber: firebaseUser.phoneNumber ?? null,
              lastLoginAt: new Date(),
              isActive: true,
              isAdmin: false,
              levelDataMigrated: false,
              created_at: new Date(),
              updated_at: new Date(),
            }
            setUserData(defaultUserData)
            await setDoc(doc(db, "users", firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? null,
              displayName: firebaseUser.displayName ?? null,
              photoURL: firebaseUser.photoURL ?? null,
              emailVerified: firebaseUser.emailVerified ?? false,
              phoneNumber: firebaseUser.phoneNumber ?? null,
              lastLoginAt: serverTimestamp(),
              isActive: true,
              isAdmin: false,
              levelDataMigrated: false,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            })
            setUserData(defaultUserData)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          setUserData(null)
        }
      } else {
        setIsLoggedIn(false)
        setUserUid(null)
        setUserData(null)
        localStorage.removeItem("isLoggedIn")
        localStorage.removeItem("userUid")
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
    setIsLoggedIn(false)
    setUserUid(null)
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userUid")
  }

  return (
    <AuthContext.Provider
      value={{ user, userData, loading, isLoggedIn, userUid, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}
