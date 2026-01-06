"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, PenSquare, Star, HelpCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export default function RecordPage() {
  const router = useRouter()
  const { isLoggedIn, loading } = useAuth()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center pb-20'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            ✍️ 기록
          </h1>
          <p className='text-theme-secondary text-sm'>
            구절 기록, 독서 질문, 리뷰, 서평을 확인해보세요
          </p>
        </header>

        {/* 네비게이션 버튼 */}
        <div className='flex flex-col md:flex-row gap-3'>
          <button
            onClick={() => router.push("/record/quotes")}
            className='bg-theme-secondary rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-left flex-1'
          >
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0'>
                <PenSquare className='h-6 w-6 text-blue-600 dark:text-blue-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <span className='font-semibold text-theme-primary text-lg block'>구절 기록</span>
                <p className='text-sm text-theme-secondary mt-1'>인상 깊은 구절 기록</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push("/record/questions")}
            className='bg-theme-secondary rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-left flex-1'
          >
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-3 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0'>
                <HelpCircle className='h-6 w-6 text-green-600 dark:text-green-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <span className='font-semibold text-theme-primary text-lg block'>독서 질문</span>
                <p className='text-sm text-theme-secondary mt-1'>책에 대한 질문</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push("/record/reviews")}
            className='bg-theme-secondary rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-left flex-1'
          >
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex-shrink-0'>
                <Star className='h-6 w-6 text-yellow-600 dark:text-yellow-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <span className='font-semibold text-theme-primary text-lg block'>리뷰</span>
                <p className='text-sm text-theme-secondary mt-1'>책에 대한 리뷰</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push("/record/critiques")}
            className='bg-theme-secondary rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-left flex-1'
          >
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex-shrink-0'>
                <Star className='h-6 w-6 text-purple-600 dark:text-purple-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <span className='font-semibold text-theme-primary text-lg block'>서평</span>
                <p className='text-sm text-theme-secondary mt-1'>책에 대한 서평</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
