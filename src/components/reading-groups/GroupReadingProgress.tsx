"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, RefreshCw, Timer } from "lucide-react"
import ConfirmModal from "@/components/ConfirmModal"
import FormModalFrame from "@/components/FormModalFrame"
import Select, { type SelectOption } from "@/components/Select"
import GroupMemberName from "@/components/reading-groups/GroupMemberName"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { CanonicalBookService } from "@/services/canonicalBookService"
import { registerUserBook } from "@/services/bookRegistrationService"
import { UserService } from "@/services/userService"
import type {
  GroupBook,
  GroupMeeting,
  GroupMember,
  GroupReadingAttribution,
  MeetingBookAssignment,
} from "@/types/readingGroup"
import { resolveMemberKind } from "@/utils/groupMemberLabels"
import {
  groupDateKey,
  inclusiveReadingDateRange,
} from "@/utils/readingGroupDates"
import {
  calculateHalfOpenOverlapSeconds,
  effectiveAssignmentEndMs,
} from "@/utils/readingSessionAttribution"
import { groupReadingNotesPath } from "@/utils/groupReadingNotesUrl"

interface GroupReadingProgressProps {
  groupId: string
  meetings: GroupMeeting[]
  assignments: MeetingBookAssignment[]
  books: GroupBook[]
  attributions: GroupReadingAttribution[]
  members: GroupMember[]
  timeZone?: string
  memberKind?: "participant" | "guardian"
  onRefetch?: () => void | Promise<unknown>
  isRefreshing?: boolean
  compact?: boolean
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}시간 ${minutes}분`
}

function formatRemaining(endAt: string, nowMs: number) {
  const remainingSeconds = Math.max(
    0,
    Math.ceil((new Date(endAt).getTime() - nowMs) / 1000),
  )
  const days = Math.floor(remainingSeconds / 86400)
  const hours = Math.floor((remainingSeconds % 86400) / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  if (days > 0) return `${days}일 ${hours}시간 ${minutes}분`
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분`
}

function assignmentPeriodMs(assignment: MeetingBookAssignment) {
  return {
    startMs: new Date(assignment.reading_start_at).getTime(),
    endMs: effectiveAssignmentEndMs(
      assignment.reading_end_at,
      assignment.stopped_at,
    ),
  }
}

export default function GroupReadingProgress({
  groupId,
  meetings,
  assignments,
  books,
  attributions,
  members,
  timeZone = "Asia/Seoul",
  memberKind,
  onRefetch,
  isRefreshing = false,
  compact = false,
}: GroupReadingProgressProps) {
  const router = useRouter()
  const { userUid } = useAuth()
  const isGuardian = resolveMemberKind({ member_kind: memberKind }) === "guardian"
  const goReadLabel = isGuardian ? "자녀 읽어주러 가기" : "타이머 페이지로 이동"
  const goReadConfirmText = isGuardian
    ? "서재 추가 후 읽어주러 가기"
    : "서재 추가 후 이동"
  const goReadConfirmReady = isGuardian ? "읽어주러 가기" : "이동하기"
  const nowMs = Date.now()
  const [userDisplayNames, setUserDisplayNames] = useState<
    Record<string, string>
  >({})
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null)
  const [timerTarget, setTimerTarget] = useState<{
    title: string
    assignment: MeetingBookAssignment
    href?: string
    needsLibraryAdd: boolean
  } | null>(null)
  const [timerBusy, setTimerBusy] = useState(false)
  const [timerError, setTimerError] = useState<string | null>(null)

  const userBooksQuery = useQuery({
    queryKey: ["group-reading-progress", "user-library", userUid],
    queryFn: () => BookService.getUserBooks(userUid!),
    enabled: Boolean(userUid),
  })
  const booksByCanonical = useMemo(
    () =>
      new Map(
        (userBooksQuery.data ?? [])
          .filter((book) => book.canonicalBookId)
          .map((book) => [book.canonicalBookId!, book]),
      ),
    [userBooksQuery.data],
  )

  const booksById = useMemo(
    () => new Map(books.map((book) => [book.id, book])),
    [books],
  )
  const assignmentsByMeeting = useMemo(() => {
    const map = new Map<string, MeetingBookAssignment[]>()
    assignments.forEach((assignment) => {
      map.set(assignment.meeting_id, [
        ...(map.get(assignment.meeting_id) ?? []),
        assignment,
      ])
    })
    return map
  }, [assignments])

  const orderedMeetings = useMemo(
    () =>
      [...meetings]
        .filter((meeting) => (assignmentsByMeeting.get(meeting.id) ?? []).length > 0)
        .sort(
          (left, right) =>
            left.sequence - right.sequence ||
            new Date(left.scheduled_at).getTime() -
              new Date(right.scheduled_at).getTime(),
        ),
    [meetings, assignmentsByMeeting],
  )

  const currentMeeting = orderedMeetings.find((meeting) => {
    const meetingAssignments = assignmentsByMeeting.get(meeting.id) ?? []
    return meetingAssignments.some((assignment) => {
      const { startMs, endMs } = assignmentPeriodMs(assignment)
      return startMs <= nowMs && nowMs < endMs
    })
  })
  const upcomingMeeting = orderedMeetings
    .filter((meeting) => {
      const meetingAssignments = assignmentsByMeeting.get(meeting.id) ?? []
      return meetingAssignments.every(
        (assignment) =>
          new Date(assignment.reading_start_at).getTime() > nowMs,
      )
    })
    .sort((left, right) => {
      const leftStart = Math.min(
        ...(assignmentsByMeeting.get(left.id) ?? []).map((item) =>
          new Date(item.reading_start_at).getTime(),
        ),
      )
      const rightStart = Math.min(
        ...(assignmentsByMeeting.get(right.id) ?? []).map((item) =>
          new Date(item.reading_start_at).getTime(),
        ),
      )
      return leftStart - rightStart
    })[0]
  const recentMeeting = [...orderedMeetings]
    .filter((meeting) => {
      const meetingAssignments = assignmentsByMeeting.get(meeting.id) ?? []
      return meetingAssignments.every((assignment) => {
        const { endMs } = assignmentPeriodMs(assignment)
        return endMs <= nowMs
      })
    })
    .sort((left, right) => {
      const leftEnd = Math.max(
        ...(assignmentsByMeeting.get(left.id) ?? []).map(
          (item) => assignmentPeriodMs(item).endMs,
        ),
      )
      const rightEnd = Math.max(
        ...(assignmentsByMeeting.get(right.id) ?? []).map(
          (item) => assignmentPeriodMs(item).endMs,
        ),
      )
      return rightEnd - leftEnd
    })[0]

  const defaultMeeting = currentMeeting ?? upcomingMeeting ?? recentMeeting
  const [selectedMeetingId, setSelectedMeetingId] = useState(
    defaultMeeting?.id ?? "",
  )
  const selectedMeeting =
    orderedMeetings.find((meeting) => meeting.id === selectedMeetingId) ??
    defaultMeeting
  const selectedAssignments = selectedMeeting
    ? (assignmentsByMeeting.get(selectedMeeting.id) ?? [])
    : []
  const periodAssignment = selectedAssignments[0]

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active" && member.user_id),
    [members],
  )
  const activeMemberUserIds = useMemo(
    () =>
      activeMembers
        .map((member) => member.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    [activeMembers],
  )

  useEffect(() => {
    if (!defaultMeeting?.id) return
    setSelectedMeetingId((current) =>
      orderedMeetings.some((meeting) => meeting.id === current)
        ? current
        : defaultMeeting.id,
    )
  }, [defaultMeeting?.id, orderedMeetings])

  useEffect(() => {
    let cancelled = false
    if (!activeMemberUserIds.length) {
      setUserDisplayNames({})
      return
    }
    void Promise.all(
      activeMemberUserIds.map(async (userId) => {
        const user = await UserService.getUser(userId)
        return [userId, user?.displayName?.trim() || ""] as const
      }),
    )
      .then((entries) => {
        if (cancelled) return
        setUserDisplayNames(
          Object.fromEntries(
            entries.filter(([, displayName]) => Boolean(displayName)),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setUserDisplayNames({})
      })
    return () => {
      cancelled = true
    }
  }, [activeMemberUserIds])

  if (!selectedMeeting || !periodAssignment) {
    return (
      <section
        className="rounded-xl bg-theme-tertiary p-4 sm:p-5"
        aria-labelledby="reading-progress-heading"
      >
        <h2
          id="reading-progress-heading"
          className="font-semibold text-theme-primary"
        >
          회차별 독서 진행
        </h2>
        <p className="mt-2 text-sm text-theme-secondary">
          읽기 기간이 설정된 회차가 아직 없습니다.
        </p>
      </section>
    )
  }

  const selectedAssignmentIds = new Set(
    selectedAssignments.map((assignment) => assignment.id),
  )
  const selectedAttributions = attributions.filter((item) =>
    selectedAssignmentIds.has(item.meeting_book_assignment_id),
  )
  const displayedSeconds = (item: GroupReadingAttribution) => {
    const assignment = selectedAssignments.find(
      (entry) => entry.id === item.meeting_book_assignment_id,
    )
    if (!assignment) return 0
    const { startMs, endMs } = assignmentPeriodMs(assignment)
    return Math.min(
      item.counted_seconds,
      calculateHalfOpenOverlapSeconds(
        new Date(item.session_start_at).getTime(),
        new Date(item.session_end_at).getTime(),
        startMs,
        endMs,
      ),
    )
  }
  const totalSeconds = selectedAttributions.reduce(
    (total, item) => total + displayedSeconds(item),
    0,
  )
  const totalsByUser = new Map<string, number>()
  selectedAttributions.forEach((item) => {
    totalsByUser.set(
      item.user_id,
      (totalsByUser.get(item.user_id) ?? 0) + displayedSeconds(item),
    )
  })
  const rankings = activeMembers
    .filter((member) => resolveMemberKind(member) === "participant")
    .map((member) => ({
      id: member.id,
      userId: member.user_id!,
      name:
        (member.user_id ? userDisplayNames[member.user_id] : "") ||
        member.display_name,
      isOwner: member.role === "owner",
      seconds: totalsByUser.get(member.user_id!) ?? 0,
    }))
    .sort(
      (left, right) =>
        right.seconds - left.seconds || left.name.localeCompare(right.name, "ko"),
    )
  const detailRanking = rankings.find((ranking) => ranking.id === detailMemberId)

  const isSelectedCurrent = selectedMeeting.id === currentMeeting?.id
  const meetingOptions: SelectOption[] = orderedMeetings.map((meeting) => ({
    value: meeting.id,
    label: `${meeting.sequence}회 · ${meeting.title}`,
  }))
  const selectedRange = inclusiveReadingDateRange(
    periodAssignment.reading_start_at,
    periodAssignment.reading_end_at,
    timeZone,
  )

  const openTimerConfirm = (assignment: MeetingBookAssignment) => {
    if (!userUid) return
    const groupBook = booksById.get(assignment.group_book_id)
    const title =
      assignment.book_title_snapshot ?? groupBook?.title ?? "이 책"
    const ownBook = booksByCanonical.get(assignment.canonical_book_id)
    setTimerError(null)
    setTimerTarget({
      title,
      assignment,
      href: ownBook ? `/book/${ownBook.id}/${userUid}` : undefined,
      needsLibraryAdd: !ownBook,
    })
  }

  const confirmGoToTimer = async (target: {
    title: string
    assignment: MeetingBookAssignment
    href?: string
    needsLibraryAdd: boolean
  }) => {
    if (!userUid || timerBusy) return
    setTimerBusy(true)
    setTimerError(null)
    try {
      let href = target.href
      if (!href) {
        const canonical = await CanonicalBookService.getById(
          target.assignment.canonical_book_id,
        )
        if (!canonical) {
          throw new Error("공유 판본 정보를 찾을 수 없습니다.")
        }
        const created = await registerUserBook(
          userUid,
          {
            title: canonical.title,
            author: canonical.author || "",
            publisher: canonical.publisher,
            publishedDate: canonical.publishedDate || "",
            status: "want-to-read",
            rating: 0,
            hasStartedReading: false,
            coverUrl: canonical.coverUrl,
            isbn13: canonical.isbn13,
            level: canonical.level,
            categoryDepth1Id: canonical.categoryDepth1Id,
            categoryDepth1Label: canonical.categoryDepth1Label,
            categoryDepth2Id: canonical.categoryDepth2Id,
            categoryDepth2Label: canonical.categoryDepth2Label,
          },
          { linkToCanonicalId: canonical.id },
        )
        await userBooksQuery.refetch()
        href = `/book/${created.id}/${userUid}`
      }
      setTimerTarget(null)
      router.push(href)
    } catch (error) {
      setTimerTarget(target)
      setTimerError(
        error instanceof Error
          ? error.message
          : "책 상세 페이지로 이동하지 못했습니다.",
      )
    } finally {
      setTimerBusy(false)
    }
  }

  const timerConfirmMessage = (() => {
    if (!timerTarget) return ""
    const beforePeriod =
      nowMs < new Date(timerTarget.assignment.reading_start_at).getTime()
    const pre =
      beforePeriod
        ? "읽기 기간 전에 시작한 타이머는 이 회차 누적에 반영되지 않고 전체 독서 시간에만 쌓입니다.\n\n"
        : ""
    if (timerTarget.needsLibraryAdd) {
      return `${pre}『${timerTarget.title}』을(를) 내 서재에 추가한 뒤 ${
        isGuardian ? "자녀 읽어주기" : "타이머"
      } 페이지로 이동할까요?`
    }
    return `${pre}『${timerTarget.title}』 ${
      isGuardian ? "자녀 읽어주기" : "타이머(책 상세)"
    } 페이지로 이동할까요?`
  })()
  const selectedStoppedDate = periodAssignment.stopped_at
    ? groupDateKey(periodAssignment.stopped_at, timeZone)
    : undefined

  const sectionPad = compact ? "p-3 sm:p-4" : "p-4 sm:p-5"
  const sectionGap = compact ? "mt-4" : "mt-5"

  return (
    <section
      className={`rounded-xl bg-theme-tertiary ${sectionPad}`}
      aria-labelledby="reading-progress-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="reading-progress-heading"
            className="font-semibold text-theme-primary"
          >
            회차별 독서 진행
          </h2>
          {!currentMeeting && (
            <p className="mt-1 text-xs text-theme-secondary">
              {upcomingMeeting
                ? "현재 읽기 기간인 회차가 없어 다가오는 회차를 안내합니다."
                : "현재 읽기 기간인 회차가 없어 최근 회차를 안내합니다."}
            </p>
          )}
        </div>
        {onRefetch && (
          <button
            type="button"
            onClick={() => void onRefetch()}
            disabled={isRefreshing}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-theme-secondary px-3 py-2 text-sm font-medium text-theme-primary disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            새로고침
          </button>
        )}
      </div>

      <label
        htmlFor="group-reading-round"
        className="mt-4 block text-sm font-medium text-theme-primary"
      >
        회차 선택
      </label>
      <Select
        id="group-reading-round"
        value={selectedMeeting.id}
        onChangeAction={setSelectedMeetingId}
        options={meetingOptions}
        className="mt-1"
        triggerClassName="min-h-11 bg-theme-secondary"
        aria-label="독서 진행 회차"
        truncate={false}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-theme-secondary p-3">
          <p className="text-xs text-theme-secondary">
            {selectedStoppedDate
              ? "중단 기간"
              : isSelectedCurrent
                ? "읽기 마감까지"
                : "읽기 기간"}
          </p>
          <p className="mt-1 font-semibold text-theme-primary">
            {selectedStoppedDate
              ? `${selectedRange.startDate} ~ ${selectedStoppedDate}`
              : isSelectedCurrent
                ? formatRemaining(periodAssignment.reading_end_at, nowMs)
                : `${selectedRange.startDate} ~ ${selectedRange.endDate}`}
          </p>
          {selectedStoppedDate && (
            <p className="mt-1 text-xs text-theme-secondary">
              원래 예정 {selectedRange.startDate} ~ {selectedRange.endDate}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-theme-secondary p-3">
          <p className="text-xs text-theme-secondary">회차 전체 누적</p>
          <p className="mt-1 text-xl font-bold text-theme-primary">
            {formatDuration(totalSeconds)}
          </p>
          <p className="mt-1 text-xs text-theme-secondary">
            책 {selectedAssignments.length}권 · 자동 귀속{" "}
            {selectedAttributions.length}건
          </p>
        </div>
      </div>

      <h3 className={`${sectionGap} text-sm font-semibold text-theme-primary`}>
        회차 책 {selectedAssignments.length}권
      </h3>
      <p className="mt-1 text-xs text-theme-secondary">
        책을 누르면 독서 노트를 보거나, 타이머로 이동할 수 있습니다.
      </p>
      <ul className="mt-2 space-y-2">
        {selectedAssignments.map((assignment) => {
          const book = booksById.get(assignment.group_book_id)
          const coverUrl = assignment.book_cover_url_snapshot ?? book?.cover_url
          const title =
            assignment.book_title_snapshot ?? book?.title ?? "책 정보 없음"
          const author =
            assignment.book_author_snapshot ?? book?.author ?? "저자 미상"
          const bookSeconds = selectedAttributions
            .filter(
              (item) => item.meeting_book_assignment_id === assignment.id,
            )
            .reduce((total, item) => total + displayedSeconds(item), 0)
          return (
            <li
              key={assignment.id}
              className="relative rounded-lg bg-theme-secondary p-3"
            >
              <button
                type="button"
                onClick={() =>
                  router.push(
                    groupReadingNotesPath(groupId, {
                      meeting: selectedMeeting?.id,
                      book: assignment.group_book_id,
                    }),
                  )
                }
                className="absolute inset-x-0 top-0 z-0 h-[calc(100%-3.25rem)] rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-theme"
                aria-label={`${title} 독서 노트 보기`}
              />
              <div className="pointer-events-none relative z-10 flex gap-3">
                <div className="relative h-20 w-[3.4rem] shrink-0 overflow-hidden rounded-md bg-theme-tertiary shadow-sm">
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={`${title} 표지`}
                      fill
                      sizes="54px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-theme-secondary">
                      <BookOpen className="h-5 w-5" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold text-theme-primary">
                    {title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-theme-secondary">
                    {author}
                  </p>
                  <p className="mt-2 text-xs font-medium text-theme-primary">
                    누적 {formatDuration(bookSeconds)}
                  </p>
                </div>
              </div>
              <div className="relative z-10 mt-2">
                <button
                  type="button"
                  onClick={() => openTimerConfirm(assignment)}
                  disabled={!userUid || timerBusy}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-accent-theme px-3 text-xs font-semibold text-white disabled:opacity-50 sm:text-sm"
                >
                  {isGuardian ? "자녀 읽어주러 가기" : "타이머 시작"}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <h3 className={`${sectionGap} text-sm font-semibold text-theme-primary`}>
        참여자별 누적 순위
      </h3>
      <p className="mt-1 text-xs text-theme-secondary">
        참여자를 누르면 책별 독서 시간을 볼 수 있습니다.
      </p>
      {rankings.length ? (
        <ol className="mt-2 space-y-2">
          {rankings.map((ranking, index) => (
            <li key={ranking.id}>
              <button
                type="button"
                onClick={() => setDetailMemberId(ranking.id)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-theme-secondary px-3 py-2 text-left transition-colors hover:bg-theme-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-theme"
                aria-label={`${ranking.name} 책별 독서 시간 보기`}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-theme-primary">
                  <span className="shrink-0 font-bold text-accent-theme">
                    {index + 1}
                  </span>
                  <GroupMemberName
                    name={ranking.name}
                    isOwner={ranking.isOwner}
                    nameClassName="truncate font-medium text-theme-primary"
                  />
                </span>
                <span className="shrink-0 text-sm font-semibold text-theme-primary">
                  {formatDuration(ranking.seconds)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-theme-secondary">
          순위를 표시할 참여자가 없습니다.
        </p>
      )}

      <FormModalFrame
        isOpen={Boolean(detailRanking)}
        onClose={() => setDetailMemberId(null)}
        title={
          detailRanking
            ? `${detailRanking.name} · ${selectedMeeting.sequence}회`
            : "책별 독서 시간"
        }
      >
        {detailRanking && (
          <div className="space-y-4">
            <div className="rounded-lg bg-theme-tertiary p-3">
              <p className="text-xs text-theme-secondary">회차 전체 누적</p>
              <p className="mt-1 text-lg font-bold text-theme-primary">
                {formatDuration(detailRanking.seconds)}
              </p>
              <p className="mt-1 text-xs text-theme-secondary">
                {selectedMeeting.sequence}회 · {selectedMeeting.title}
              </p>
            </div>

            <ul className="space-y-2">
              {selectedAssignments.map((assignment) => {
                const book = booksById.get(assignment.group_book_id)
                const coverUrl =
                  assignment.book_cover_url_snapshot ?? book?.cover_url
                const title =
                  assignment.book_title_snapshot ??
                  book?.title ??
                  "책 정보 없음"
                const author =
                  assignment.book_author_snapshot ?? book?.author ?? "저자 미상"
                const bookSeconds = selectedAttributions
                  .filter(
                    (item) =>
                      item.meeting_book_assignment_id === assignment.id &&
                      item.user_id === detailRanking.userId,
                  )
                  .reduce((total, item) => total + displayedSeconds(item), 0)
                return (
                  <li
                    key={assignment.id}
                    className="flex gap-3 rounded-lg bg-theme-tertiary p-3"
                  >
                    <div className="relative h-20 w-[3.4rem] shrink-0 overflow-hidden rounded-md bg-theme-secondary shadow-sm">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={`${title} 표지`}
                          fill
                          sizes="54px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-theme-secondary">
                          <BookOpen className="h-5 w-5" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold text-theme-primary">
                        {title}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-theme-secondary">
                        {author}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-theme-primary">
                        {formatDuration(bookSeconds)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDetailMemberId(null)}
                className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </FormModalFrame>

      <ConfirmModal
        isOpen={Boolean(timerTarget)}
        onClose={() => {
          if (timerBusy) return
          setTimerTarget(null)
          setTimerError(null)
        }}
        onConfirm={() => {
          if (!timerTarget) return
          void confirmGoToTimer(timerTarget)
        }}
        title={goReadLabel}
        message={
          timerError
            ? `${timerConfirmMessage}\n\n오류: ${timerError}`
            : timerConfirmMessage
        }
        confirmText={
          timerBusy
            ? "이동 중…"
            : timerTarget?.needsLibraryAdd
              ? goReadConfirmText
              : goReadConfirmReady
        }
        cancelText="닫기"
        icon={Timer}
        iconColor="text-accent-theme"
        iconBgColor="bg-accent-theme/15"
        confirmButtonColor="bg-accent-theme"
        confirmButtonHoverColor="hover:bg-accent-theme-secondary"
        showSubtitle={false}
      />
    </section>
  )
}
