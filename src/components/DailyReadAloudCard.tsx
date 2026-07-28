"use client"

import Link from "next/link"
import { BookOpenCheck, Check } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { queryKeys } from "@/lib/queryKeys"
import { GuardianChildService } from "@/services/guardianChildService"
import { DAILY_READ_ALOUD_GOAL_SECONDS } from "@/types/guardian"
import { canLinkChildren } from "@/utils/koreanAge"
import { getKoreaDate } from "@/utils/timeUtils"

function formatGoalClock(totalSeconds: number): string {
  const capped = Math.max(0, Math.min(totalSeconds, DAILY_READ_ALOUD_GOAL_SECONDS))
  const minutes = Math.floor(capped / 60)
  const seconds = capped % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export default function DailyReadAloudCard() {
  const { userUid, userData } = useAuth()
  const { allReadingSessions } = useData()

  const childrenQuery = useQuery({
    queryKey: queryKeys.guardian.children(userUid),
    queryFn: () => GuardianChildService.listChildren(userUid!),
    enabled: Boolean(userUid) && canLinkChildren(userData?.birthYear),
    staleTime: 60_000,
  })

  const children = childrenQuery.data ?? []
  if (
    !userUid ||
    !canLinkChildren(userData?.birthYear) ||
    childrenQuery.isLoading
  ) {
    return null
  }
  if (children.length === 0) return null

  const today = getKoreaDate(new Date())
  const todayReadAloudSessions = allReadingSessions.filter(
    (session) =>
      session.user_id === userUid &&
      session.date === today &&
      session.reading_mode === "read_aloud",
  )

  const childRows = children.map((child) => {
    const seconds = todayReadAloudSessions.reduce((total, session) => {
      return (
        total +
        GuardianChildService.childSecondsFromSegments(
          session.read_aloud_segments ?? [],
          child.child_user_id,
        )
      )
    }, 0)
    const progress = Math.min(1, seconds / DAILY_READ_ALOUD_GOAL_SECONDS)
    const done = seconds >= DAILY_READ_ALOUD_GOAL_SECONDS
    return {
      id: child.id,
      name: child.child_display_name,
      seconds,
      progress,
      done,
    }
  })

  const doneCount = childRows.filter((row) => row.done).length
  const allDone = doneCount === childRows.length

  return (
    <section
      aria-labelledby="daily-read-aloud-heading"
      className="rounded-xl border-2 border-accent-theme/30 bg-gradient-to-br from-accent-theme-tertiary/40 to-accent-theme/10 p-4 shadow-md sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-theme/20 sm:h-12 sm:w-12">
            <BookOpenCheck
              className="h-5 w-5 accent-theme-primary sm:h-6 sm:w-6"
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <h2
              id="daily-read-aloud-heading"
              className="text-sm font-semibold text-theme-primary"
            >
              하루 15분 읽어주기
            </h2>
            <p className="mt-0.5 text-xs text-theme-tertiary">
              {allDone
                ? "오늘 모두 달성했어요"
                : `자녀마다 15분 · ${doneCount}/${childRows.length}명 달성`}
            </p>
          </div>
        </div>
        <Link
          href="/mypage/children"
          className="shrink-0 text-xs font-semibold text-accent-theme hover:underline"
        >
          자녀 관리
        </Link>
      </div>

      <ul className="space-y-3">
        {childRows.map((row) => (
          <li
            key={row.id}
            className="rounded-lg bg-theme-secondary/80 px-3 py-2.5"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-theme-primary">
                {row.done ? (
                  <Check
                    className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
                    aria-hidden
                  />
                ) : null}
                <span className="truncate">{row.name}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-theme-secondary">
                {formatGoalClock(row.seconds)}
                <span className="font-normal text-theme-tertiary"> / 15:00</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-theme-tertiary">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  row.done ? "bg-green-500" : "bg-accent-theme"
                }`}
                style={{ width: `${Math.round(row.progress * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-theme-tertiary">
        여러 명에게 동시에 읽어주면 각자 시간이 함께 쌓입니다.
      </p>
    </section>
  )
}
