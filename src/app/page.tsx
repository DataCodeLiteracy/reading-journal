"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  BookOpen,
  Clock,
  TrendingUp,
  Target,
  Bookmark,
  CheckCircle,
  Calendar,
  Star,
  Trophy,
  Zap,
  Timer,
  Flame,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useData } from "@/contexts/DataContext"
// 체크리스트 컴포넌트 (현재 사용하지 않음, 나중에 사용할 수 있도록 유지)
// import LongTermChecklistSection from "@/components/LongTermChecklistSection"

import { formatDisplayExperienceString } from "@/utils/experienceUtils"
import {
  getLastWeekRangeKST,
  getLastWeekISOStringKST,
  getWeekdayLabelKST,
} from "@/utils/timeUtils"
import { sortBooksByLastReadFromSessions } from "@/utils/booksSortByLastRead"
import WeeklyReadingTimeCard from "@/components/WeeklyReadingTimeCard"
import WeeklyRecapModal, { DaySummary } from "@/components/WeeklyRecapModal"
import { HomePageSkeleton } from "@/components/skeletons"

const WEEKLY_RECAP_STORAGE_KEY = "weeklyRecapShown_"

export default function Home() {
  const router = useRouter()
  const { user, loading, isLoggedIn, userUid } = useAuth()
  const { settings } = useSettings()
  const {
    allBooks,
    allReadingSessions,
    userStatistics,
    userDataInitialized,
  } = useData()

  const getTotalBooks = () => allBooks.length
  const getReadingBooks = () =>
    allBooks.filter((book) => book.status === "reading").length
  const getCompletedBooks = () =>
    allBooks.filter((book) => book.status === "completed").length
  const getWantToReadBooks = () =>
    allBooks.filter((book) => book.status === "want-to-read").length
  const getOnHoldBooks = () =>
    allBooks.filter((book) => book.status === "on-hold").length
  const getAverageRating = () => {
    if (allBooks.length === 0) return 0
    const totalRating = allBooks.reduce((acc, book) => acc + book.rating, 0)
    return totalRating / allBooks.length
  }

  const [showRecapModal, setShowRecapModal] = useState(false)
  const [recapData, setRecapData] = useState<{
    weekLabel: string
    daySummaries: DaySummary[]
    totalSeconds: number
    goalHours: number
    goalMet: boolean
    bonusExp: number | null
  } | null>(null)

  const RECENT_BOOKS_LIMIT = 5
  /** 같은 주·같은 lastWeekISO에 대해 요약 로드를 한 번만 시도 (의존성 재실행 시 모달 반복 방지) */
  const weeklyRecapLoadRef = useRef<string | null>(null)

  const recentReadingBooks = useMemo(() => {
    const reading = allBooks.filter((b) => b.status === "reading")
    return sortBooksByLastReadFromSessions(reading, allReadingSessions).slice(
      0,
      RECENT_BOOKS_LIMIT,
    )
  }, [allBooks, allReadingSessions])

  // 지난주 독서 요약: 해당 주차에 대해 확인(닫기)한 적 없으면 월~일 중 첫 접속 시 표시. 확인 시 localStorage에 저장해 재표시 안 함.
  useEffect(() => {
    if (!userUid || !userDataInitialized) return

    const lastWeekISO = getLastWeekISOStringKST()
    if (typeof window !== "undefined" && localStorage.getItem(WEEKLY_RECAP_STORAGE_KEY + lastWeekISO)) return

    if (weeklyRecapLoadRef.current === lastWeekISO) return
    weeklyRecapLoadRef.current = lastWeekISO

    try {
      const { monday, sunday } = getLastWeekRangeKST()
      const weekLabel = `${monday.slice(5).replace("-", "/")} ~ ${sunday.slice(5).replace("-", "/")}`
      const inRange = allReadingSessions.filter(
        (s) => s.date >= monday && s.date <= sunday,
      )
      const totalSeconds = inRange.reduce((sum, s) => sum + (s.duration ?? 0), 0)
      const goalHours =
        userStatistics?.weeklyReadingGoalHours ??
        settings.weeklyReadingGoalHours ??
        5
      const goalMet = totalSeconds >= goalHours * 3600
      const bonusExp =
        userStatistics?.lastWeeklyBonusWeek === lastWeekISO ? goalHours * 20 : null

      const byDate: Record<string, { bookId: string; duration: number }[]> = {}
      inRange.forEach((s) => {
        if (!byDate[s.date]) byDate[s.date] = []
        const existing = byDate[s.date].find((x) => x.bookId === s.bookId)
        if (existing) existing.duration += s.duration ?? 0
        else byDate[s.date].push({ bookId: s.bookId, duration: s.duration ?? 0 })
      })
      const daySummaries: DaySummary[] = Object.keys(byDate)
        .sort()
        .map((date) => {
          const items = byDate[date].map(({ bookId, duration }) => ({
            bookTitle: allBooks.find((b) => b.id === bookId)?.title ?? "알 수 없는 책",
            duration,
          }))
          return {
            date,
            weekday: getWeekdayLabelKST(date),
            items,
          }
        })

      setRecapData({
        weekLabel,
        daySummaries,
        totalSeconds,
        goalHours,
        goalMet,
        bonusExp,
      })
      setShowRecapModal(true)
    } catch (e) {
      console.error("Failed to load weekly recap:", e)
    }
  }, [
    userUid,
    userDataInitialized,
    allReadingSessions,
    userStatistics,
    settings.weeklyReadingGoalHours,
    allBooks,
  ])

  const handleCloseRecapModal = () => {
    const lastWeekISO = getLastWeekISOStringKST()
    if (typeof window !== "undefined") {
      localStorage.setItem(WEEKLY_RECAP_STORAGE_KEY + lastWeekISO, "1")
    }
    setShowRecapModal(false)
    setRecapData(null)
  }

  const recentAddedBooks = useMemo(() => {
    const createdMs = (book: Book) => {
      if (!book.created_at) return 0
      const t = new Date(book.created_at).getTime()
      return Number.isFinite(t) ? t : 0
    }
    return [...allBooks]
      .sort((a, b) => {
        const diff = createdMs(b) - createdMs(a)
        if (diff !== 0) return diff
        // 동일 시각(또는 둘 다 없음)이면 id로 안정 정렬
        return b.id.localeCompare(a.id)
      })
      .slice(0, RECENT_BOOKS_LIMIT)
  }, [allBooks])

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  const handleBookClick = (bookId: string) => {
    router.push(`/book/${bookId}/${userUid || "1"}`)
  }

  if (loading) {
    return <HomePageSkeleton />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <div className='mb-4'>
            <h1 className='text-3xl font-bold text-theme-primary'>
              📚 독서 기록장
            </h1>
          </div>
          <p className='text-theme-secondary text-sm'>
            나만의 독서 여정을 기록하고 관리해보세요
          </p>
          {user && (
            <p className='text-sm text-theme-tertiary mt-1'>
              안녕하세요, {user.displayName || "사용자"}님!
            </p>
          )}
        </header>
        {/* 장기 체크리스트 섹션 - 현재 서비스에서는 사용하지 않음 */}
        {/* 나중에 사용할 수 있도록 컴포넌트로 분리되어 있음 */}
        {/* 
        {userUid && (
          <LongTermChecklistSection
            userUid={userUid}
            onChecklistComplete={() => {
              // 체크리스트 완료 후 처리 로직
            }}
          />
        )}
        */}

        {/* 이번 주 독서 시간 카드 */}
        {userUid && (
          <div className='mb-6'>
            <WeeklyReadingTimeCard userId={userUid} />
          </div>
        )}

        {/* 사용자 통계 섹션 */}
        {userStatistics && (
          <div className='mb-6 bg-theme-secondary rounded-lg p-6 shadow-sm border-card'>
            <h2 className='text-lg font-semibold text-theme-primary mb-4'>
              📊 나의 독서 현황
            </h2>
            {(() => {
              const actualExp = userStatistics.experience || 0
              const displayExp = formatDisplayExperienceString(actualExp)
              console.log("[메인 페이지] 사용자 통계:", {
                user_id: userUid,
                level: userStatistics.level || 1,
                actualExperience: actualExp,
                displayExperience: displayExp,
                totalReadingTime: userStatistics.totalReadingTime || 0,
              })
              return null
            })()}
            <div className='grid grid-cols-3 gap-y-5 gap-x-6'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Trophy className='h-6 w-6 text-yellow-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>레벨</p>
                <p className='text-lg font-bold text-theme-primary'>
                  Lv.{userStatistics.level || 1}
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Zap className='h-6 w-6 text-purple-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>경험치</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {formatDisplayExperienceString(userStatistics.experience || 0)} EXP
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Clock className='h-6 w-6 accent-theme-primary' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>
                  총 독서 시간
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(userStatistics.totalReadingTime / 3600)}시간{" "}
                  {Math.floor((userStatistics.totalReadingTime % 3600) / 60)}분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <BookOpen className='h-6 w-6 text-green-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>독서 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {userStatistics.totalSessions}회
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Timer className='h-6 w-6 text-blue-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>평균 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(userStatistics.averageSessionTime / 60)}분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Flame className='h-6 w-6 text-orange-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>연속 독서일</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {userStatistics.readingStreak}일
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 책 통계 카드 */}
        <div className='grid grid-cols-2 gap-2 mb-6'>
          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm border-card'>
            <div className='flex items-center'>
              <BookOpen className='h-5 w-5 accent-theme-primary' />
              <div className='ml-2'>
                <p className='text-xs font-medium text-theme-secondary'>
                  총 등록된 책
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {getTotalBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm border-card'>
            <div className='flex items-center'>
              <Bookmark className='h-5 w-5 text-green-500' />
              <div className='ml-2'>
                <p className='text-xs font-medium text-theme-secondary'>
                  읽는 중
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {getReadingBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm border-card'>
            <div className='flex items-center'>
              <CheckCircle className='h-5 w-5 text-green-600' />
              <div className='ml-2'>
                <p className='text-xs font-medium text-theme-secondary'>
                  완독한 책
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {getCompletedBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm border-card'>
            <div className='flex items-center'>
              <Calendar className='h-5 w-5 text-purple-500' />
              <div className='ml-2'>
                <p className='text-xs font-medium text-theme-secondary'>
                  읽고 싶은 책
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {getWantToReadBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm border-card'>
            <div className='flex items-center'>
              <Clock className='h-5 w-5 text-orange-500' />
              <div className='ml-2'>
                <p className='text-xs font-medium text-theme-secondary'>
                  보류 중
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {getOnHoldBooks()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm border-card'>
            <div className='flex items-center'>
              <Star className='h-5 w-5 text-yellow-500' />
              <div className='ml-2'>
                <p className='text-xs font-medium text-theme-secondary'>
                  평균 평점
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {getAverageRating().toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 읽는 중인 책 */}
        <div className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-theme-primary'>
              📖 최근 읽는 중인 책
            </h2>
            <button
              onClick={() => router.push("/books?tab=reading")}
              className='text-sm text-accent-theme hover:underline'
            >
              전체 보기 →
            </button>
          </div>
          <div className='bg-theme-secondary rounded-lg shadow-sm border-card overflow-hidden'>
            <div className='max-h-[280px] overflow-y-auto px-4'>
              {recentReadingBooks.length === 0 ? (
                <div className='py-4 text-center text-theme-tertiary text-sm'>
                  읽는 중인 책이 없습니다
                </div>
              ) : (
                <div>
                  {recentReadingBooks.map((book: Book) => (
                    <div
                      key={book.id}
                      onClick={() => handleBookClick(book.id)}
                      className='flex items-center gap-3 py-3 px-3 -mx-1 rounded-lg cursor-pointer hover:bg-theme-tertiary/40 active:bg-theme-tertiary/50 transition-colors first:pt-3 last:pb-3 border border-transparent hover:border-theme-tertiary/50'
                    >
                      <div className='w-12 h-14 bg-theme-tertiary rounded-md flex items-center justify-center flex-shrink-0'>
                        <BookOpen className='h-6 w-6 text-theme-tertiary' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-medium text-theme-primary truncate'>
                          {book.title}
                        </h3>
                        <p className='text-sm text-theme-secondary truncate'>
                          {book.author || "저자 미상"}
                        </p>
                      </div>
                      <ChevronRight className='h-5 w-5 text-theme-tertiary shrink-0' />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 최근 등록한 책 */}
        <div className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-theme-primary'>
              📚 최근 등록한 책
            </h2>
            <button
              onClick={() => router.push("/books?tab=want-to-read")}
              className='text-sm text-accent-theme hover:underline'
            >
              전체 보기 →
            </button>
          </div>
          <div className='bg-theme-secondary rounded-lg shadow-sm border-card overflow-hidden'>
            <div className='max-h-[280px] overflow-y-auto px-4'>
              {recentAddedBooks.length === 0 ? (
                <div className='py-4 text-center text-theme-tertiary text-sm'>
                  등록한 책이 없습니다
                </div>
              ) : (
                <div>
                  {recentAddedBooks.map((book: Book) => (
                    <div
                      key={book.id}
                      onClick={() => handleBookClick(book.id)}
                      className='flex items-center gap-3 py-3 px-3 -mx-1 rounded-lg cursor-pointer hover:bg-theme-tertiary/40 active:bg-theme-tertiary/50 transition-colors first:pt-3 last:pb-3 border border-transparent hover:border-theme-tertiary/50'
                    >
                      <div className='w-12 h-14 bg-theme-tertiary rounded-md flex items-center justify-center flex-shrink-0'>
                        <BookOpen className='h-6 w-6 text-theme-tertiary' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-medium text-theme-primary truncate'>
                          {book.title}
                        </h3>
                        <p className='text-sm text-theme-secondary truncate'>
                          {book.author || "저자 미상"}
                        </p>
                      </div>
                      <ChevronRight className='h-5 w-5 text-theme-tertiary shrink-0' />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRecapModal && recapData && (
        <WeeklyRecapModal
          isOpen={showRecapModal}
          onClose={handleCloseRecapModal}
          weekLabel={recapData.weekLabel}
          daySummaries={recapData.daySummaries}
          totalSeconds={recapData.totalSeconds}
          goalHours={recapData.goalHours}
          goalMet={recapData.goalMet}
          bonusExp={recapData.bonusExp}
        />
      )}
    </div>
  )
}
