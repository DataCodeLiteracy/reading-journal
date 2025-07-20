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

interface AuthContextType {
  user: FirebaseUser | null
  loading: boolean
  isLoggedIn: boolean
  userUid: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
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
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userUid, setUserUid] = useState<string | null>(null)

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    const storedUserUid = localStorage.getItem("userUid")

    setIsLoggedIn(storedIsLoggedIn)
    setUserUid(storedUserUid)

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        setIsLoggedIn(true)
        setUserUid(firebaseUser.uid)
        localStorage.setItem("isLoggedIn", "true")
        localStorage.setItem("userUid", firebaseUser.uid)
      } else {
        setIsLoggedIn(false)
        setUserUid(null)
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
      value={{ user, loading, isLoggedIn, userUid, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}
