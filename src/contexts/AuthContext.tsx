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
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isLoggedIn: false,
  userUid: null,
  signOut: async () => {},
  refreshUserData: async () => {},
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

  const loadUserDataFromFirestore = async (
    firebaseUser: FirebaseUser,
  ): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
    if (!userDoc.exists()) return null

    const existingData = userDoc.data() as Record<string, unknown>
    const isAdmin = existingData.isAdmin === true

    return {
      ...existingData,
      uid: firebaseUser.uid,
      email: (existingData.email as string | null) ?? firebaseUser.email ?? null,
      displayName: (existingData.displayName as string | null) ?? null,
      photoURL:
        (existingData.photoURL as string | null) ??
        firebaseUser.photoURL ??
        null,
      emailVerified: firebaseUser.emailVerified ?? false,
      phoneNumber: (existingData.phoneNumber as string | null) ?? null,
      birthYear: (existingData.birthYear as number | null | undefined) ?? null,
      gender:
        (existingData.gender as User["gender"] | null | undefined) ?? null,
      bio: (existingData.bio as string | null | undefined) ?? null,
      region: (existingData.region as string | null | undefined) ?? null,
      lastLoginAt: new Date(),
      updated_at: new Date(),
      isAdmin,
    } as User
  }

  const refreshUserData = async () => {
    const firebaseUser = auth.currentUser
    if (!firebaseUser) return
    try {
      const data = await loadUserDataFromFirestore(firebaseUser)
      if (data) setUserData(data)
    } catch (error) {
      console.error("Error refreshing user data:", error)
    }
  }

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
            const data = await loadUserDataFromFirestore(firebaseUser)
            if (data) setUserData(data)
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
      value={{ user, userData, loading, isLoggedIn, userUid, signOut, refreshUserData }}
    >
      {children}
    </AuthContext.Provider>
  )
}
