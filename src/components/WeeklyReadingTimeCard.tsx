"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, Calendar } from "lucide-react"
import { ReadingSessionService } from "@/services/readingSessionService"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { ReadingSession } from "@/types/user"
import { formatReadingTimeFromSeconds } from "@/utils/timeUtils"
import { useSettings } from "@/contexts/SettingsContext"
import { useData } from "@/contexts/DataContext"

const WEEKLY_POPUP_KEY = "weeklyGoalPopup_"

interface WeeklyReadingTimeCardProps {
  userId: string
}

/**
 * 월요일~일요일을 한 주로 하여, 이번 주 독서 시간(초)을 계산
 */
function getCurrentWeekRange(): { monday: string; sunday: string } {
  const now = new Date()
  const day = now.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { monday: toYMD(monday), sunday: toYMD(sunday) }
}

function getWeekLabel(monday: string, sunday: string): string {
  const format = (s: string) => {
    const [, m, d] = s.split("-")
    return `${m}/${d}`
  }
  return `${format(monday)} ~ ${format(sunday)}`
}

export default function WeeklyReadingTimeCard({ userId }: WeeklyReadingTimeCardProps) {
  const { settings } = useSettings()
  const { userStatistics, refreshAllData } = useData()

  const goalHours =
    userStatistics?.weeklyReadingGoalHours ??
    settings.weeklyReadingGoalHours ??
    5
  const goalSeconds = goalHours * 3600

  const [totalSeconds, setTotalSeconds] = useState<number>(0)
  const [weekLabel, setWeekLabel] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [bonusExpThisWeek, setBonusExpThisWeek] = useState<number | null>(null)
  const bonusCheckedRef = useRef(false)

  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setLoading(true)
      try {
        const { monday, sunday } = getCurrentWeekRange()
        setWeekLabel(getWeekLabel(monday, sunday))

        const sessions: ReadingSession[] =
          await ReadingSessionService.getUserReadingSessions(userId)
        const inRange = sessions.filter(
          (s) => s.date >= monday && s.date <= sunday
        )
        const total = inRange.reduce((sum, s) => sum + (s.duration ?? 0), 0)
        setTotalSeconds(total)
      } catch (error) {
        console.error("Weekly reading time load error:", error)
        setTotalSeconds(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId])

  useEffect(() => {
    if (loading || !userId) return
    if (totalSeconds < goalSeconds) return

    const currentWeek = UserStatisticsService.getISOWeekString(new Date())
    const popupKey = WEEKLY_POPUP_KEY + currentWeek
    const alreadyShown = typeof window !== "undefined" && localStorage.getItem(popupKey)

    if (alreadyShown) return
    if (bonusCheckedRef.current) return
    bonusCheckedRef.current = true

    const run = async () => {
      const lastBonus = userStatistics?.lastWeeklyBonusWeek
      if (lastBonus === currentWeek) {
        setBonusExpThisWeek(goalHours * 20)
        setShowBonusModal(true)
        return
      }

      const result = await UserStatisticsService.addWeeklyGoalBonus(
        userId,
        goalHours,
        currentWeek
      )
      if (result) {
        await refreshAllData()
        setBonusExpThisWeek(result.bonusExp)
        setShowBonusModal(true)
      }
    }

    run()
  }, [
    loading,
    userId,
    totalSeconds,
    goalSeconds,
    goalHours,
    userStatistics?.lastWeeklyBonusWeek,
    refreshAllData,
  ])

  const handleCloseBonusModal = () => {
    const currentWeek = UserStatisticsService.getISOWeekString(new Date())
    if (typeof window !== "undefined") {
      localStorage.setItem(WEEKLY_POPUP_KEY + currentWeek, "1")
    }
    setShowBonusModal(false)
    setBonusExpThisWeek(null)
  }

  const progressPercent =
    goalSeconds > 0 ? Math.min(100, (totalSeconds / goalSeconds) * 100) : 0

  if (loading) {
    return (
      <div className='rounded-xl border-2 border-accent-theme/30 bg-gradient-to-br from-accent-theme-tertiary/40 to-accent-theme/10 p-4 sm:p-5 shadow-md'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-accent-theme/20 shrink-0'>
            <Clock className='h-5 w-5 sm:h-6 sm:w-6 accent-theme-primary' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-medium text-theme-secondary'>
              이번 주 독서 시간
            </p>
            <p className='text-theme-tertiary text-sm'>불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='rounded-xl border-2 border-accent-theme/30 bg-gradient-to-br from-accent-theme-tertiary/40 to-accent-theme/10 p-4 sm:p-5 shadow-md'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-accent-theme/20'>
              <Clock className='h-5 w-5 sm:h-6 sm:w-6 accent-theme-primary' />
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-medium text-theme-secondary'>
                이번 주 독서 시간
              </p>
              <p className='mt-0.5 flex items-center gap-1.5 text-xs text-theme-tertiary'>
                <Calendar className='h-3.5 w-3.5 shrink-0' />
                <span className='truncate'>{weekLabel} (월~일)</span>
              </p>
            </div>
          </div>
          <p className='text-xl sm:text-2xl font-bold text-theme-primary tabular-nums shrink-0'>
            {formatReadingTimeFromSeconds(totalSeconds)} / {goalHours}시간
          </p>
        </div>

        <div className='mt-3'>
          <div className='h-2 w-full overflow-hidden rounded-full bg-theme-tertiary'>
            <div
              className='h-full rounded-full bg-accent-theme transition-all duration-300'
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className='mt-1 text-right text-xs text-theme-tertiary'>
            {progressPercent.toFixed(0)}%
          </p>
        </div>

        <div className='mt-4 space-y-2 rounded-lg bg-theme-primary/50 p-3 text-sm text-theme-secondary'>
          <p>
            문해력 향상을 위해, 내용을 이해하고 기억하며 읽어보세요.
          </p>
          <p>
            내용을 이해하며 읽지 않고 시간만 채우는 독서는 문해력 향상에
            도움되지 않습니다.
          </p>
          <p>
            제대로 이해하며 일주일에 <strong className='text-theme-primary'>{goalHours}시간</strong>만
            꾸준히 읽어도 문해력이 크게 늘어날 수 있어요.
          </p>
          <p>
            제대로 읽었는지 확인하는 가장 좋은 방법은{" "}
            <strong className='text-theme-primary'>독서 골든벨</strong>입니다.
          </p>
          <p className='text-xs text-theme-tertiary pt-0.5'>
            목표 달성 시 보너스 경험치(목표시간×20, 이번 주 {goalHours * 20} EXP)를
            받을 수 있어요.
          </p>
        </div>
      </div>

      {showBonusModal && bonusExpThisWeek !== null && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50'
          role='dialog'
          aria-modal='true'
          aria-labelledby='weekly-bonus-title'
        >
          <div className='w-full max-w-sm rounded-xl bg-theme-secondary p-5 shadow-lg'>
            <h2 id='weekly-bonus-title' className='text-lg font-bold text-theme-primary mb-2'>
              이번 주 목표 달성
            </h2>
            <p className='text-theme-secondary text-sm mb-4'>
              보너스 경험치 <strong className='text-accent-theme'>+{bonusExpThisWeek} EXP</strong>
              (목표 {goalHours}시간 × 20)를 받았어요.
            </p>
            <button
              onClick={handleCloseBonusModal}
              className='w-full py-2.5 rounded-lg bg-accent-theme text-white font-medium'
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  )
}
