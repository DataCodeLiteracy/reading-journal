"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Home, ArrowLeft, Cpu } from "lucide-react"
import { adminService } from "@/services/adminService"
import { useAuth } from "@/contexts/AuthContext"
import { GenericRouteSkeleton } from "@/components/skeletons"

export default function AdminPage() {
  const router = useRouter()
  const { user, userData, loading, isLoggedIn } = useAuth()
  const [stats, setStats] = useState({
    totalRecords: 0,
    monthlyRecords: 0,
    totalWords: 0,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const loadStats = async () => {
    try {
      setIsLoadingStats(true)
      const allRecords = await adminService.getAllReadingRecords()
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth() + 1
      const monthlyRecords = await adminService.getMonthlyRecords(
        currentYear,
        currentMonth
      )
      const wordAnalysis = await adminService.getWordAnalysis()

      setStats({
        totalRecords: allRecords.length,
        monthlyRecords: monthlyRecords.length,
        totalWords: wordAnalysis.length,
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }

    if (!loading && isLoggedIn && userData && !userData.isAdmin) {
      router.push("/mypage")
      return
    }

    if (isLoggedIn && userData && userData.isAdmin) {
      loadStats()
    }
  }, [isLoggedIn, loading, user, router])

  // 로딩 중이거나 권한이 없는 경우
  if (loading) {
    return <GenericRouteSkeleton rows={4} />
  }

  // 로그인하지 않았거나 관리자가 아닌 경우
  if (!isLoggedIn || !userData || !userData.isAdmin) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        {/* 헤더 */}
        <header className='mb-6'>
          <div className='flex items-center gap-4 mb-4'>
            <button
              onClick={() => router.push("/mypage")}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <ArrowLeft className='h-5 w-5' />
              마이페이지로 돌아가기
            </button>
            <button
              onClick={() => router.push("/")}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <Home className='h-5 w-5' />
              메인 페이지
            </button>
          </div>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            🛠️ 관리자 페이지
          </h1>
          <p className='text-theme-secondary text-sm'>
            독서 기록을 관리하고 분석 결과를 확인하세요
          </p>
        </header>

        {/* 메뉴 (독서 골든벨 출제 요청만 노출) */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 mb-6'>
          <button
            onClick={() => router.push("/admin/ai-settings")}
            className='bg-gradient-to-r from-slate-600 to-slate-800 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left text-white min-h-[120px] sm:min-h-[140px]'
          >
            <div className='flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
              <div className='p-1.5 sm:p-2 bg-white/20 rounded-lg'>
                <Cpu className='h-4 w-4 sm:h-5 sm:w-5' />
              </div>
            </div>
            <h3 className='font-semibold text-base sm:text-lg mb-1 sm:mb-2'>
              AI 채점 모델
            </h3>
            <p className='text-xs sm:text-sm text-white/80 leading-relaxed'>
              이해도 점검·발췌 요약·리뷰 비교용 OpenAI 모델 선택
            </p>
          </button>
          <button
            onClick={() => router.push("/admin/golden-bell-requests")}
            className='bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 text-left text-white min-h-[120px] sm:min-h-[140px]'
          >
            <div className='flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
              <div className='p-1.5 sm:p-2 bg-white/20 rounded-lg'>
                <BookOpen className='h-4 w-4 sm:h-5 sm:w-5' />
              </div>
            </div>
            <h3 className='font-semibold text-base sm:text-lg mb-1 sm:mb-2'>
              독서 골든벨 출제 요청
            </h3>
            <p className='text-xs sm:text-sm text-white/80 leading-relaxed'>
              유저별·책별 골든벨 출제 신청 목록
            </p>
          </button>
        </div>

        {/* 데이터 현황 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
          <h2 className='text-xl font-semibold text-theme-primary mb-4'>
            📊 데이터 현황
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
              <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                {isLoadingStats ? "..." : stats.totalRecords}
              </div>
              <div className='text-sm text-theme-secondary'>총 독서 기록</div>
            </div>
            <div className='text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
              <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                {isLoadingStats ? "..." : stats.monthlyRecords}
              </div>
              <div className='text-sm text-theme-secondary'>이번 달 기록</div>
            </div>
            <div className='text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
              <div className='text-2xl font-bold text-purple-600 dark:text-purple-400'>
                {isLoadingStats ? "..." : stats.totalWords}
              </div>
              <div className='text-sm text-theme-secondary'>총 모르는 단어</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
