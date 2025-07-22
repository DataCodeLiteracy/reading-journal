"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Settings,
  BarChart3,
  LogOut,
  User,
  Trash2,
  BookOpen,
  Calendar,
  Star,
  Clock,
  TrendingUp,
  ArrowLeft,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { Book } from "@/types/book"
import { UserStatistics } from "@/types/user"
import ConfirmModal from "@/components/ConfirmModal"

export default function MyPage() {
  const router = useRouter()
  const { user, loading, isLoggedIn, userUid, signOut } = useAuth()
  const { allBooks, userStatistics, isLoading } = useData()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false)

  // 실시간으로 계산하는 함수들
  const getTotalBooks = () => allBooks.length
  const getReadingBooks = () =>
    allBooks.filter((book) => book.status === "reading").length
  const getCompletedBooks = () =>
    allBooks.filter((book) => book.status === "completed").length
  const getWantToReadBooks = () =>
    allBooks.filter((book) => book.status === "want-to-read").length
  const getAverageRating = () => {
    if (allBooks.length === 0) return 0
    const totalRating = allBooks.reduce((acc, book) => acc + book.rating, 0)
    return totalRating / allBooks.length
  }

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
  }, [isLoggedIn, loading, router])

  const handleLogout = () => {
    setIsLogoutModalOpen(true)
  }

  const confirmLogout = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLogoutModalOpen(false)
    }
  }

  const handleDeleteAccount = () => {
    setIsDeleteAccountModalOpen(true)
  }

  const confirmDeleteAccount = async () => {
    // 계정 삭제 로직 구현 예정
    console.log("Delete account functionality to be implemented")
    setIsDeleteAccountModalOpen(false)
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <User className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            뒤로가기
          </button>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            👤 마이페이지
          </h1>
          <p className='text-theme-secondary text-sm'>
            내 정보와 설정을 관리해보세요
          </p>
          {user && (
            <p className='text-sm text-theme-tertiary mt-1'>
              {user.displayName || user.email}님
            </p>
          )}
        </header>

        {/* 사용자 통계 요약 */}
        {!isLoading && userStatistics && (
          <div className='mb-4 bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <h2 className='text-lg font-semibold text-theme-primary mb-3'>
              📊 독서 통계 요약
            </h2>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <BookOpen className='h-5 w-5 accent-theme-primary' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>
                  총 등록된 책
                </p>
                <p className='text-sm font-bold text-theme-primary'>
                  {getTotalBooks()}권
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Calendar className='h-5 w-5 text-green-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>완독한 책</p>
                <p className='text-sm font-bold text-theme-primary'>
                  {getCompletedBooks()}권
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Star className='h-5 w-5 text-yellow-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>평균 평점</p>
                <p className='text-sm font-bold text-theme-primary'>
                  {getAverageRating().toFixed(1)}
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Clock className='h-5 w-5 text-purple-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>
                  총 독서 시간
                </p>
                <p className='text-sm font-bold text-theme-primary'>
                  {userStatistics
                    ? `${Math.floor(
                        userStatistics.totalReadingTime / 3600
                      )}시간 ${Math.floor(
                        (userStatistics.totalReadingTime % 3600) / 60
                      )}분 ${userStatistics.totalReadingTime % 60}초`
                    : "0시간 0분 0초"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 카드들 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mb-4'>
          <button
            onClick={() => router.push("/mypage/settings")}
            className='bg-theme-secondary rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-accent-theme-tertiary rounded-lg'>
                <Settings className='h-5 w-5 accent-theme-primary' />
              </div>
              <div>
                <h3 className='font-semibold text-theme-primary mb-1'>설정</h3>
                <p className='text-xs text-theme-secondary'>
                  다크모드, 폰트 설정
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push("/mypage/statistics")}
            className='bg-theme-secondary rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-green-100 dark:bg-green-900/20 rounded-lg'>
                <BarChart3 className='h-5 w-5 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <h3 className='font-semibold text-theme-primary mb-1'>
                  상세 통계
                </h3>
                <p className='text-xs text-theme-secondary'>
                  독서 패턴 분석 및 통계
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* 계정 관리 */}
        <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
          <h2 className='text-lg font-semibold text-theme-primary mb-3'>
            계정 관리
          </h2>
          <div className='space-y-2'>
            <button
              onClick={handleLogout}
              className='flex items-center gap-3 w-full p-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
            >
              <LogOut className='h-4 w-4' />
              <span className='text-sm'>로그아웃</span>
            </button>
            <button
              onClick={handleDeleteAccount}
              className='flex items-center gap-3 w-full p-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
            >
              <Trash2 className='h-4 w-4' />
              <span className='text-sm'>계정 삭제</span>
            </button>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title='로그아웃'
        message='정말로 로그아웃하시겠습니까?'
        confirmText='로그아웃'
        icon={LogOut}
      />
      <ConfirmModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirm={confirmDeleteAccount}
        title='계정 삭제'
        message='정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        confirmText='삭제'
        icon={Trash2}
      />
    </div>
  )
}
