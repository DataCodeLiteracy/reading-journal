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
  Home,
  ClipboardList,
  Globe,
  Lock,
  Bell,
  Target,
  Check,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { useSettings } from "@/contexts/SettingsContext"
import { Book } from "@/types/book"
import { UserStatistics } from "@/types/user"
import ConfirmModal from "@/components/ConfirmModal"
import WeeklyReadingTimeCard from "@/components/WeeklyReadingTimeCard"
import { formatReadingTimeFromSeconds } from "@/utils/timeUtils"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { MyPageHomeSkeleton } from "@/components/skeletons"

export default function MyPage() {
  const router = useRouter()
  const { user, userData, loading, isLoggedIn, userUid, signOut } = useAuth()
  const { allBooks, userStatistics, isLoading, refreshAllData } = useData()
  const { settings, updateSettings } = useSettings()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false)
  const [isProfilePublic, setIsProfilePublic] = useState(true)
  const [weeklyGoalInput, setWeeklyGoalInput] = useState("")
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)

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

  useEffect(() => {
    if (userStatistics) {
      setIsProfilePublic(userStatistics.isProfilePublic !== false)
    }
  }, [userStatistics])

  useEffect(() => {
    const fromServer = userStatistics?.weeklyReadingGoalHours
    const fromLocal = settings.weeklyReadingGoalHours ?? 5
    const value = fromServer ?? fromLocal
    setWeeklyGoalInput(String(value))
  }, [userStatistics?.weeklyReadingGoalHours, settings.weeklyReadingGoalHours])

  const handleSaveWeeklyGoal = async () => {
    setGoalError(null)
    const trimmed = weeklyGoalInput.trim()
    if (trimmed === "") {
      setGoalError("목표 시간을 입력해주세요.")
      return
    }
    const value = parseInt(trimmed, 10)
    if (Number.isNaN(value) || value < 1 || value > 168) {
      setGoalError("1~168 사이의 숫자를 입력해주세요.")
      return
    }
    if (!userUid) return
    setIsSavingGoal(true)
    setGoalSaved(false)
    try {
      updateSettings({ weeklyReadingGoalHours: value })
      await UserStatisticsService.createOrUpdateUserStatistics(userUid, {
        weeklyReadingGoalHours: value,
      })
      await refreshAllData()
      setWeeklyGoalInput(String(value))
      setGoalSaved(true)
      setTimeout(() => setGoalSaved(false), 2000)
    } catch (e) {
      console.error("Failed to save weekly goal:", e)
      setGoalError("저장에 실패했습니다.")
    } finally {
      setIsSavingGoal(false)
    }
  }

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
    return <MyPageHomeSkeleton />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.push("/")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <Home className='h-5 w-5' />
            메인 페이지로 이동
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

        {/* 이번 주 독서 시간 카드 */}
        {userUid && (
          <div className='mb-4'>
            <WeeklyReadingTimeCard userId={userUid} />
          </div>
        )}

        {/* 이번 주 독서 목표 설정 */}
        {userUid && (
          <div className='mb-4 bg-theme-secondary rounded-lg p-4 shadow-sm border-card'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='p-2 bg-green-100 dark:bg-green-900/20 rounded-lg'>
                <Target className='h-5 w-5 text-green-600 dark:text-green-400' />
              </div>
              <h2 className='text-lg font-semibold text-theme-primary'>
                이번 주 독서 목표
              </h2>
            </div>
            <p className='text-sm text-theme-secondary mb-3'>
              주간 목표 독서 시간(시간)을 설정하면 위 카드에 진행률로 표시됩니다.
            </p>
            {goalError && (
              <p className='text-sm text-red-600 dark:text-red-400 mb-2'>
                {goalError}
              </p>
            )}
            <div className='flex items-center gap-3 flex-wrap'>
              <div className='relative flex-1 min-w-[6rem] max-w-[8rem]'>
                <input
                  type='text'
                  inputMode='numeric'
                  value={weeklyGoalInput}
                  onChange={(e) => {
                    setWeeklyGoalInput(e.target.value)
                    if (goalError) setGoalError(null)
                  }}
                  placeholder='5'
                  className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-4 py-2.5 pr-10 text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                />
                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary text-sm'>
                  시간
                </span>
              </div>
              <span className='text-theme-tertiary text-sm'>/ 주 (월~일)</span>
              <button
                onClick={handleSaveWeeklyGoal}
                disabled={isSavingGoal}
                className='flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-theme text-white font-medium hover:bg-accent-theme-secondary transition-colors disabled:opacity-50'
              >
                {isSavingGoal ? (
                  <>
                    <span className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
                    저장 중
                  </>
                ) : goalSaved ? (
                  <>
                    <Check className='h-4 w-4' />
                    저장됨
                  </>
                ) : (
                  "저장"
                )}
              </button>
            </div>
          </div>
        )}

        {/* 사용자 통계 요약 */}
        {!isLoading && userStatistics && (
          <div className='mb-4 bg-theme-secondary rounded-lg p-4 shadow-sm border-card'>
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
                    ? formatReadingTimeFromSeconds(
                        userStatistics.totalReadingTime
                      )
                    : "0:00"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 카드들 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mb-4'>
          <button
            onClick={() => router.push("/mypage/settings")}
            className='bg-theme-secondary rounded-lg p-4 shadow-sm border-card hover:shadow-md transition-shadow text-left'
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
            className='bg-theme-secondary rounded-lg p-4 shadow-sm border-card hover:shadow-md transition-shadow text-left'
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

          <button
            onClick={() => router.push("/mypage/checklists")}
            className='bg-theme-secondary rounded-lg p-4 shadow-sm border-card hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg'>
                <ClipboardList className='h-5 w-5 text-orange-600 dark:text-orange-400' />
              </div>
              <div>
                <h3 className='font-semibold text-theme-primary mb-1'>
                  체크리스트
                </h3>
                <p className='text-xs text-theme-secondary'>
                  독서 관련 체크리스트 관리
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push("/mypage/golden-bell")}
            className='bg-theme-secondary rounded-lg p-4 shadow-sm border-card hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg'>
                <Bell className='h-5 w-5 text-yellow-600 dark:text-yellow-400' />
              </div>
              <div>
                <h3 className='font-semibold text-theme-primary mb-1'>
                  독서 골든벨
                </h3>
                <p className='text-xs text-theme-secondary'>
                  골든벨 풀이 기록 확인
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* 관리자 메뉴 */}
        {userData && userData.isAdmin && (
          <div className='mb-4'>
            <h2 className='text-lg font-semibold text-theme-primary mb-3'>
              🛠️ 관리자 도구
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <button
                onClick={() => router.push("/admin")}
                className='bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left text-white'
              >
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-white/20 rounded-lg'>
                    <BarChart3 className='h-5 w-5' />
                  </div>
                  <div>
                    <h3 className='font-semibold mb-1'>관리자 페이지</h3>
                    <p className='text-xs text-white/80'>
                      독서 기록 관리 및 분석
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 프로필 공개 설정 */}
        <div className='bg-theme-secondary rounded-lg p-4 shadow-sm border-card mb-4'>
          <h2 className='text-lg font-semibold text-theme-primary mb-3'>
            프로필 공개 설정
          </h2>
          <div className='flex items-center justify-between p-3 bg-theme-tertiary rounded-lg'>
            <div className='flex items-center gap-2'>
              {isProfilePublic ? (
                <Globe className='h-5 w-5 text-blue-500' />
              ) : (
                <Lock className='h-5 w-5 text-gray-400' />
              )}
              <div>
                <label className='text-sm font-medium text-theme-primary cursor-pointer'>
                  프로필 공개
                </label>
                <p className='text-xs text-theme-tertiary'>
                  {isProfilePublic
                    ? "다른 사용자들이 내 프로필과 통계를 볼 수 있습니다"
                    : "내 프로필과 통계가 비공개됩니다"}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!userUid) return
                const newValue = !isProfilePublic
                setIsProfilePublic(newValue)
                try {
                  await UserStatisticsService.createOrUpdateUserStatistics(userUid, {
                    isProfilePublic: newValue,
                  })
                } catch (error) {
                  console.error("Error updating profile visibility:", error)
                  setIsProfilePublic(!newValue) // 롤백
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isProfilePublic ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isProfilePublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 계정 관리 */}
        <div className='bg-theme-secondary rounded-lg p-4 shadow-sm border-card'>
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
