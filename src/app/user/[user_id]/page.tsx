"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  Clock,
  BookOpen,
  TrendingUp,
  Trophy,
  Heart,
  MessageSquare,
  Globe,
  Lock,
} from "lucide-react"
import { UserService } from "@/services/userService"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { BookService } from "@/services/bookService"
import { User as UserType, UserStatistics } from "@/types/user"
import { Book } from "@/types/book"

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ user_id: string }>
}) {
  const router = useRouter()
  const [resolvedParams, setResolvedParams] = useState<{
    user_id: string
  } | null>(null)
  const [profileUser, setProfileUser] = useState<UserType | null>(null)
  const [userStats, setUserStats] = useState<UserStatistics | null>(null)
  const [completedBooks, setCompletedBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((resolved) => {
      setResolvedParams(resolved)
    })
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return

    const loadUserProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [user, stats] = await Promise.all([
          UserService.getUser(resolvedParams.user_id),
          UserStatisticsService.getUserStatistics(resolvedParams.user_id),
        ])

        if (!user) {
          setError("사용자를 찾을 수 없습니다.")
          return
        }

        setProfileUser(user)
        setUserStats(stats)

        // 프로필이 공개되어 있거나 통계가 공개되어 있는 경우에만 통계 로드
        if (stats && (stats.isProfilePublic !== false)) {
          // 완독한 책 수 조회
          const books = await BookService.getUserBooks(resolvedParams.user_id)
          const completed = books.filter((book) => book.status === "completed")
          setCompletedBooks(completed)
        }
      } catch (error) {
        console.error("Error loading user profile:", error)
        setError("프로필을 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [resolvedParams])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    }
    return `${minutes}분`
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center pb-20'>
        <div className='text-center'>
          <User className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !profileUser) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center pb-20'>
        <div className='text-center'>
          <User className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary mb-4'>{error || "사용자를 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.push("/")}
            className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isProfilePublic = userStats?.isProfilePublic !== false

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        {/* 헤더 */}
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.back()}
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <h1 className='text-2xl font-bold text-theme-primary'>유저 프로필</h1>
        </div>

        {/* 프로필 정보 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex items-start gap-4 mb-4'>
            {profileUser.photoURL ? (
              <img
                src={profileUser.photoURL}
                alt={profileUser.displayName || "사용자"}
                className='w-20 h-20 rounded-full'
              />
            ) : (
              <div className='w-20 h-20 rounded-full bg-theme-tertiary flex items-center justify-center'>
                <User className='h-10 w-10 text-theme-secondary' />
              </div>
            )}
            <div className='flex-1'>
              <h2 className='text-xl font-semibold text-theme-primary mb-1'>
                {profileUser.displayName || profileUser.email || "익명"}
              </h2>
              {profileUser.email && (
                <p className='text-sm text-theme-secondary mb-2'>{profileUser.email}</p>
              )}
              <div className='flex items-center gap-2'>
                {isProfilePublic ? (
                  <>
                    <Globe className='h-4 w-4 text-blue-500' />
                    <span className='text-xs text-theme-secondary'>공개 프로필</span>
                  </>
                ) : (
                  <>
                    <Lock className='h-4 w-4 text-gray-400' />
                    <span className='text-xs text-theme-secondary'>비공개 프로필</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 통계 정보 (공개된 경우만) */}
        {isProfilePublic && userStats ? (
          <div className='space-y-4'>
            {/* 레벨 및 경험치 */}
            <div className='bg-theme-secondary rounded-lg shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <Trophy className='h-5 w-5 text-yellow-500' />
                <h3 className='text-lg font-semibold text-theme-primary'>레벨 정보</h3>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-xs text-theme-secondary mb-1'>현재 레벨</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    Lv.{userStats.level || 1}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-theme-secondary mb-1'>총 경험치</p>
                  <p className='text-2xl font-bold text-theme-primary'>
                    {(userStats.experience || 0).toLocaleString()} EXP
                  </p>
                </div>
              </div>
            </div>

            {/* 독서 통계 */}
            <div className='bg-theme-secondary rounded-lg shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <BookOpen className='h-5 w-5 text-green-500' />
                <h3 className='text-lg font-semibold text-theme-primary'>독서 통계</h3>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-xs text-theme-secondary mb-1'>총 독서 시간</p>
                  <p className='text-lg font-semibold text-theme-primary'>
                    {formatTime(userStats.totalReadingTime || 0)}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-theme-secondary mb-1'>완독한 책</p>
                  <p className='text-lg font-semibold text-theme-primary'>
                    {completedBooks.length}권
                  </p>
                </div>
                <div>
                  <p className='text-xs text-theme-secondary mb-1'>독서 세션</p>
                  <p className='text-lg font-semibold text-theme-primary'>
                    {userStats.totalSessions || 0}회
                  </p>
                </div>
                <div>
                  <p className='text-xs text-theme-secondary mb-1'>연속 독서일</p>
                  <p className='text-lg font-semibold text-theme-primary'>
                    {userStats.readingStreak || 0}일
                  </p>
                </div>
              </div>
            </div>

            {/* 소셜 통계 */}
            {(userStats.totalLikesReceived || userStats.totalCommentsWritten) && (
              <div className='bg-theme-secondary rounded-lg shadow-sm p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <TrendingUp className='h-5 w-5 text-purple-500' />
                  <h3 className='text-lg font-semibold text-theme-primary'>소셜 통계</h3>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex items-center gap-2'>
                    <Heart className='h-4 w-4 text-red-500' />
                    <div>
                      <p className='text-xs text-theme-secondary'>받은 좋아요</p>
                      <p className='text-lg font-semibold text-theme-primary'>
                        {userStats.totalLikesReceived || 0}개
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <MessageSquare className='h-4 w-4 text-blue-500' />
                    <div>
                      <p className='text-xs text-theme-secondary'>작성한 댓글</p>
                      <p className='text-lg font-semibold text-theme-primary'>
                        {userStats.totalCommentsWritten || 0}개
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-6 text-center'>
            <Lock className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <p className='text-theme-secondary'>
              이 사용자의 프로필은 비공개입니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

