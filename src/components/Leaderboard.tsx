"use client"

import { useState, useEffect } from "react"
import { Trophy, Medal, Award, Clock, TrendingUp, User, ChevronRight } from "lucide-react"
import { LeaderboardService, LeaderboardUser } from "@/services/leaderboardService"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { formatDisplayExperienceString } from "@/utils/experienceUtils"

interface LeaderboardProps {
  limit?: number
  showFullList?: boolean
}

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

export default function Leaderboard({
  limit = 5,
  showFullList = false,
}: LeaderboardProps) {
  const router = useRouter()
  const { userUid, isLoggedIn, loading } = useAuth()
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"level" | "experience" | "readingTime">("level")

  useEffect(() => {
    console.log("[리더보드 컴포넌트] useEffect 실행:", {
      loading,
      isLoggedIn,
      userUid,
      limit
    })

    const loadLeaderboard = async () => {
      try {
        setIsLoading(true)
        console.log("[리더보드 컴포넌트] 리더보드 데이터 로드 시작")
        // 메인 페이지에서는 항상 레벨 기준으로 TOP5만 표시
        const users = await LeaderboardService.getTopUsersByLevel(limit)
        console.log("[리더보드 컴포넌트] 전체 유저:", users.map(u => ({
          user_id: u.user_id,
          displayName: u.displayName,
          level: u.level,
          actualExperience: u.experience,
          displayExperience: formatDisplayExperienceString(u.experience),
          totalReadingTime: u.totalReadingTime,
        })))
        console.log("[리더보드 컴포넌트] 현재 로그인한 유저:", {
          userUid,
          isLoggedIn,
          loading,
          isInList: users.some(u => u.user_id === userUid)
        })
        
        setTopUsers(users)
      } catch (error) {
        console.error("Error loading leaderboard:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // 로그인 상태가 확인될 때까지 대기
    if (loading) {
      console.log("[리더보드 컴포넌트] 로딩 중, 대기...")
      setIsLoading(true)
      return
    }

    // 로그인 상태가 확인된 후 데이터 로드
    // 이미 로그인되어 있는 상태에서도 컴포넌트가 마운트되면 데이터를 로드함
    // 로그인하지 않은 경우에도 리더보드는 표시할 수 있음
    loadLeaderboard()
  }, [limit, userUid, isLoggedIn, loading])

  if (isLoading) {
    return (
      <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
        <div className='flex items-center justify-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-2 border-accent-theme border-t-transparent' />
        </div>
      </div>
    )
  }

  if (topUsers.length === 0) {
    return (
      <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
        <h3 className='text-lg font-semibold text-theme-primary mb-4'>
          🏆 리더보드
        </h3>
        <div className='text-center py-8'>
          <Trophy className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary'>아직 순위 데이터가 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-theme-primary'>
          🏆 레벨 순위 TOP5
        </h3>
        {!showFullList && (
          <button
            onClick={() => router.push("/leaderboard")}
            className='flex items-center gap-1 text-sm text-accent-theme hover:text-accent-theme-secondary transition-colors'
          >
            더보기
            <ChevronRight className='h-4 w-4' />
          </button>
        )}
        {showFullList && (
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setSortBy("level")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                sortBy === "level"
                  ? "bg-accent-theme text-white"
                  : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
              }`}
            >
              레벨
            </button>
            <button
              onClick={() => setSortBy("experience")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                sortBy === "experience"
                  ? "bg-accent-theme text-white"
                  : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
              }`}
            >
              경험치
            </button>
            <button
              onClick={() => setSortBy("readingTime")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                sortBy === "readingTime"
                  ? "bg-accent-theme text-white"
                  : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
              }`}
            >
              독서시간
            </button>
          </div>
        )}
      </div>

      <div className='space-y-2'>
        {topUsers.map((user, index) => {
          const rank = index + 1
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
  )
}

