"use client"

import type { ReactNode } from "react"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, User } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Book } from "@/types/book"
import { queryKeys } from "@/lib/queryKeys"
import { fetchExploreRegistrantsForBooks } from "@/services/exploreRegistrantsService"
import { formatReadingTimeFromSeconds } from "@/utils/timeUtils"

const STATUS_LABELS: Record<Book["status"], string> = {
  reading: "읽는 중",
  completed: "완독",
  "want-to-read": "읽고 싶은 책",
  "on-hold": "보류",
}

type ExploreRegistrantsPanelProps = {
  books: readonly Book[]
  currentUserUid?: string | null
  adminActions?: ReactNode
}

export default function ExploreRegistrantsPanel({
  books,
  currentUserUid,
  adminActions,
}: ExploreRegistrantsPanelProps) {
  const router = useRouter()

  const bookIdsKey = useMemo(
    () =>
      [...books]
        .map((b) => b.id)
        .sort()
        .join("|"),
    [books],
  )

  const registrantsQuery = useQuery({
    queryKey: queryKeys.explore.registrants(bookIdsKey),
    queryFn: () => fetchExploreRegistrantsForBooks(books),
    enabled: books.length > 0,
    staleTime: 5 * 60_000,
  })

  const rows = registrantsQuery.data
  const error = registrantsQuery.isError
    ? "등록 유저 정보를 불러오지 못했습니다."
    : null

  return (
    <div className="border-t border-theme-tertiary bg-theme-tertiary/20 px-3 py-3 sm:px-4">
      {adminActions}

      <p className="mb-2 text-xs font-medium text-theme-secondary">
        이 판본을 등록한 유저
      </p>

      {error && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {registrantsQuery.isPending && !rows ? (
        <div className="flex items-center gap-2 py-3 text-sm text-theme-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          불러오는 중…
        </div>
      ) : rows ? (
        <ul className="space-y-2">
          {rows.map(({ book, displayName, totalReadingSeconds }) => {
            const rereadCount = book.rereadCount ?? 0
            const readingLabel =
              totalReadingSeconds > 0
                ? formatReadingTimeFromSeconds(totalReadingSeconds)
                : "기록 없음"

            return (
              <li
                key={book.id}
                className="rounded-lg border border-theme-tertiary/60 bg-theme-secondary/80 px-3 py-2.5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => router.push(`/user/${book.user_id}`)}
                    className="inline-flex min-w-0 items-center gap-1.5 text-left text-sm font-medium text-accent-theme hover:underline"
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{displayName}</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-theme-tertiary/70 px-2 py-0.5 text-xs text-theme-secondary">
                      {STATUS_LABELS[book.status]}
                    </span>
                    <span className="text-xs text-theme-tertiary">
                      회독 {rereadCount}회
                    </span>
                    <span className="text-xs text-theme-tertiary">
                      독서 {readingLabel}
                    </span>
                    {currentUserUid === book.user_id && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/book/${book.id}/${book.user_id}`)
                        }
                        className="rounded-md bg-accent-theme px-2 py-1 text-xs text-white"
                      >
                        내 책 보기
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
