"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  AlertCircle,
  Clock,
  TrendingUp,
  Target,
  User,
  Bookmark,
  CheckCircle,
  Calendar,
  Star,
  Trophy,
  Zap,
  Timer,
  Flame,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useData } from "@/contexts/DataContext"
import { BookService } from "@/services/bookService"
import { ChecklistService } from "@/services/checklistService"
// 체크리스트 컴포넌트 (현재 사용하지 않음, 나중에 사용할 수 있도록 유지)
// import LongTermChecklistSection from "@/components/LongTermChecklistSection"

import { ApiError } from "@/lib/apiClient"
import Leaderboard from "@/components/Leaderboard"
import { formatDisplayExperienceString } from "@/utils/experienceUtils"

export default function Home() {
  const router = useRouter()
  const { user, loading, isLoggedIn, userUid } = useAuth()
  const { settings } = useSettings()
  const {
    allBooks,
    userStatistics,
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

  const [recentBooks, setRecentBooks] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)

  // 체크리스트 관련 상태 (현재 서비스에서는 사용하지 않음)
  // 나중에 사용할 수 있도록 코드는 유지하되 주석 처리
  // const [userChecklist, setUserChecklist] = useState<UserChecklist | null>(null)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadRecentBooks = async () => {
      try {
        setError(null)

        if (!userUid) {
          setError("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.")
          return
        }

        // 최근 읽는 중인 책 5개만 가져오기
        const booksData = await BookService.getUserBooksByStatusPaginated(
          userUid,
          "reading",
          1,
          5
        )

        setRecentBooks(booksData.books)
      } catch (error) {
        console.error("Error loading recent books:", error)
        if (error instanceof ApiError) {
          setError(error.message)
        } else {
          setError("책 목록을 불러오는 중 오류가 발생했습니다.")
        }
      }
    }

    loadRecentBooks()
  }, [isLoggedIn, userUid])

  const handleBookClick = (bookId: string) => {
    router.push(`/book/${bookId}/${userUid || "1"}`)
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

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h1 className='text-3xl font-bold text-theme-primary'>
              📚 독서 기록장
            </h1>
            <button
              onClick={() => router.push("/mypage")}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <User className='h-5 w-5' />
              <span className='text-sm'>마이페이지</span>
            </button>
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
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

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

        {/* 리더보드 섹션 */}
        <div className='mb-6'>
          <Leaderboard limit={5} showFullList={false} />
        </div>

        {/* 사용자 통계 섹션 */}
        {userStatistics && (
          <div className='mb-6 bg-theme-secondary rounded-lg p-6 shadow-sm'>
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
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-4'>
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
          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm'>
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

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm'>
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

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm'>
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

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm'>
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

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm'>
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

          <div className='bg-theme-secondary rounded-lg p-3 shadow-sm'>
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
        {recentBooks.length > 0 && (
          <div className='mb-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold text-theme-primary'>
                📖 최근 읽는 중인 책
              </h2>
              <button
                onClick={() => router.push("/books")}
                className='text-sm text-accent-theme hover:underline'
              >
                전체 보기 →
              </button>
            </div>
            <div className='grid grid-cols-1 gap-3'>
              {recentBooks.map((book: Book) => (
                <div
                  key={book.id}
                  onClick={() => handleBookClick(book.id)}
                  className='bg-theme-secondary rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 cursor-pointer'
                >
                  <div className='flex items-start gap-3'>
                    <div className='w-14 h-18 bg-theme-tertiary rounded-md flex items-center justify-center flex-shrink-0'>
                      <BookOpen className='h-7 w-7 text-gray-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-theme-primary mb-1 truncate'>
                        {book.title}
                      </h3>
                      <p className='text-sm text-theme-secondary truncate'>
                        {book.author || "저자 미상"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
