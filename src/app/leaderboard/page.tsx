"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Trophy,
  Medal,
  Award,
  Clock,
  TrendingUp,
  User,
  Search,
  X,
  ArrowLeft,
  AlertCircle,
} from "lucide-react"
import { LeaderboardService, LeaderboardUser } from "@/services/leaderboardService"
import { useAuth } from "@/contexts/AuthContext"
import Pagination from "@/components/Pagination"
import { formatDisplayExperienceString } from "@/utils/experienceUtils"

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  }
  return `${minutes}분`
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className='h-6 w-6 text-yellow-500' />
    case 2:
      return <Medal className='h-6 w-6 text-gray-400' />
    case 3:
      return <Award className='h-6 w-6 text-amber-600' />
    default:
      return (
        <div className='w-6 h-6 rounded-full bg-theme-tertiary flex items-center justify-center'>
          <span className='text-xs font-semibold text-theme-secondary'>{rank}</span>
        </div>
      )
  }
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { userUid, isLoggedIn, loading } = useAuth()
  const [rankedUsers, setRankedUsers] = useState<LeaderboardUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(20)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!isLoggedIn) return

    const loadRankedUsers = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await LeaderboardService.getRankedUsersPaginated(
          currentPage,
          itemsPerPage,
          searchQuery.trim() || undefined
        )

        console.log("[레벨 순위 페이지] 전체 유저:", result.users.map(u => ({
          user_id: u.user_id,
          displayName: u.displayName,
          level: u.level,
          actualExperience: u.experience,
          displayExperience: formatDisplayExperienceString(u.experience),
          totalReadingTime: u.totalReadingTime,
        })))
        console.log("[레벨 순위 페이지] 총 유저 수:", result.total)

        setRankedUsers(result.users)
        setTotalItems(result.total)
      } catch (error) {
        console.error("Error loading ranked users:", error)
        setError("순위를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadRankedUsers()
  }, [isLoggedIn, currentPage, itemsPerPage, searchQuery])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // 검색어 변경 시 페이지를 1로 리셋
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center pb-20'>
        <div className='text-center'>
          <Trophy className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  // 전체 순위 계산 (현재 페이지 기준)
  const getGlobalRank = (index: number) => {
    return (currentPage - 1) * itemsPerPage + index + 1
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <div className='flex items-center gap-4 mb-4'>
            <button
              onClick={() => router.push("/")}
              className='p-2 hover:bg-theme-tertiary rounded-lg transition-colors'
            >
              <ArrowLeft className='h-5 w-5 text-theme-primary' />
            </button>
            <h1 className='text-3xl font-bold text-theme-primary'>
              🏆 레벨 순위
            </h1>
          </div>
          <p className='text-theme-secondary text-sm'>
            모든 사용자의 레벨 순위를 확인하세요
          </p>
        </header>

        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        {/* 검색 섹션 */}
        <div className='mb-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              type='text'
              placeholder='사용자 이름으로 검색...'
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent'
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors'
                title='검색어 지우기'
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
            <div className='flex items-center justify-center py-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-2 border-accent-theme border-t-transparent' />
            </div>
          </div>
        ) : rankedUsers.length === 0 ? (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
            <div className='text-center py-12'>
              <Trophy className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-theme-secondary'>
                {searchQuery
                  ? `"${searchQuery}"에 대한 검색 결과가 없습니다.`
                  : "아직 순위 데이터가 없습니다."}
              </p>
            </div>
          </div>
        ) : (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
            <div className='space-y-2'>
              {rankedUsers.map((user, index) => {
                const rank = getGlobalRank(index)
                const isCurrentUser = userUid === user.user_id

                return (
                  <div
                    key={user.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isCurrentUser
                        ? "bg-accent-theme/10 border-2 border-accent-theme"
                        : "bg-theme-tertiary hover:bg-theme-tertiary/80"
                    }`}
                  >
                    {/* 순위 */}
                    <div className='flex-shrink-0'>{getRankIcon(rank)}</div>

                    {/* 프로필 사진 */}
                    <div className='flex-shrink-0'>
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className='w-10 h-10 rounded-full'
                        />
                      ) : (
                        <div className='w-10 h-10 rounded-full bg-theme-secondary flex items-center justify-center'>
                          <User className='h-5 w-5 text-theme-tertiary' />
                        </div>
                      )}
                    </div>

                    {/* 사용자 정보 */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/user/${user.user_id}`)
                          }}
                          className={`font-semibold text-sm truncate hover:underline ${
                            isCurrentUser ? "text-accent-theme" : "text-theme-primary"
                          }`}
                        >
                          {user.displayName}
                          {isCurrentUser && " (나)"}
                        </button>
                      </div>
                      <div className='flex items-center gap-3 text-xs text-theme-secondary'>
                        <div className='flex items-center gap-1'>
                          <TrendingUp className='h-3 w-3' />
                          <span>Lv.{user.level}</span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <span>EXP: {formatDisplayExperienceString(user.experience)}</span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <Clock className='h-3 w-3' />
                          <span>{formatTime(user.totalReadingTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 페이지네이션 */}
        {!isLoading && rankedUsers.length > 0 && (
          <div className='mt-8 mb-8'>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / itemsPerPage)}
              onPageChange={handlePageChange}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

