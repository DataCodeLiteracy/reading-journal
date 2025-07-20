"use client"

import { useState, useEffect } from "react"
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, googleProvider, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { BookOpen, LogIn, LogOut, User as UserIcon } from "lucide-react"
import { User } from "@/types/user"
import { UserService } from "@/services/userService"

export default function LoginPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)

      if (firebaseUser) {
        localStorage.setItem("isLoggedIn", "true")
        localStorage.setItem("userUid", firebaseUser.uid)

        await saveUserToFirestore(firebaseUser)
        router.push("/")
      } else {
        localStorage.removeItem("isLoggedIn")
        localStorage.removeItem("userUid")
      }
    })

    return () => unsubscribe()
  }, [router])

  const saveUserToFirestore = async (firebaseUser: FirebaseUser) => {
    try {
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        phoneNumber: firebaseUser.phoneNumber,
        lastLoginAt: new Date(),
        isActive: true,
      }

      await UserService.createOrUpdateUser(userData)
    } catch (error) {}
  }

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true)
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {}
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
      <div className='bg-theme-secondary rounded-lg shadow-lg p-8 w-full max-w-md mx-4'>
        <div className='text-center mb-8'>
          <BookOpen className='h-16 w-16 accent-theme-primary mx-auto mb-4' />
          <h1 className='text-2xl font-bold text-theme-primary mb-2'>
            독서 기록장
          </h1>
          <p className='text-theme-secondary'>
            나만의 독서 여정을 기록하고 관리해보세요
          </p>
        </div>

        {user ? (
          <div className='space-y-4'>
            <div className='flex items-center gap-4 p-4 bg-theme-tertiary rounded-lg'>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className='w-12 h-12 rounded-full'
                />
              ) : (
                <div className='w-12 h-12 bg-theme-tertiary rounded-full flex items-center justify-center'>
                  <UserIcon className='h-6 w-6 text-theme-secondary' />
                </div>
              )}
              <div className='flex-1'>
                <p className='font-medium text-theme-primary'>
                  {user.displayName || "사용자"}
                </p>
                <p className='text-sm text-theme-secondary'>{user.email}</p>
                {user.emailVerified && (
                  <p className='text-xs text-green-600 dark:text-green-400'>
                    이메일 인증됨
                  </p>
                )}
              </div>
            </div>

            <div className='space-y-3'>
              <button
                onClick={() => router.push("/")}
                className='w-full flex items-center justify-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary text-white py-3 px-4 rounded-lg transition-colors'
              >
                <BookOpen className='h-5 w-5' />
                독서 기록장으로 이동
              </button>

              <button
                onClick={handleSignOut}
                className='w-full flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors'
              >
                <LogOut className='h-5 w-5' />
                로그아웃
              </button>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className='w-full flex items-center justify-center gap-2 bg-theme-primary hover:bg-theme-tertiary text-theme-primary border border-theme-tertiary py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <svg className='h-5 w-5' viewBox='0 0 24 24'>
                <path
                  fill='currentColor'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                />
                <path
                  fill='currentColor'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                />
                <path
                  fill='currentColor'
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                />
                <path
                  fill='currentColor'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                />
              </svg>
              {signingIn ? "로그인 중..." : "Google로 로그인"}
            </button>

            <p className='text-xs text-theme-tertiary text-center'>
              로그인하면 독서 기록장을 사용할 수 있습니다
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
