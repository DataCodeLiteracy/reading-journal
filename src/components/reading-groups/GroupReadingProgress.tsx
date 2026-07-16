"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"
import Select, { type SelectOption } from "@/components/Select"
import { UserService } from "@/services/userService"
import type {
  GroupBook,
  GroupMeeting,
  GroupMember,
  GroupReadingAttribution,
  MeetingBookAssignment,
} from "@/types/readingGroup"
import {
  groupDateKey,
  inclusiveReadingDateRange,
} from "@/utils/readingGroupDates"
import {
  calculateHalfOpenOverlapSeconds,
  effectiveAssignmentEndMs,
} from "@/utils/readingSessionAttribution"

interface GroupReadingProgressProps {
  meetings: GroupMeeting[]
  assignments: MeetingBookAssignment[]
  books: GroupBook[]
  attributions: GroupReadingAttribution[]
  members: GroupMember[]
  timeZone?: string
  onRefetch?: () => void | Promise<unknown>
  isRefreshing?: boolean
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
  const hours = Math.ceil((remainingSeconds % 86400) / 3600)
  if (days > 0) return `${days}일 ${hours}시간`
  return `${hours}시간`
}

export default function GroupReadingProgress({
  meetings,
  assignments,
  books,
  attributions,
  members,
  timeZone = "Asia/Seoul",
  onRefetch,
  isRefreshing = false,
}: GroupReadingProgressProps) {
  const nowMs = Date.now()
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({})
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]))
  const booksById = new Map(books.map((book) => [book.id, book]))
  const orderedAssignments = [...assignments].sort((left, right) => {
    const leftMeeting = meetingsById.get(left.meeting_id)
    const rightMeeting = meetingsById.get(right.meeting_id)
    return (leftMeeting?.sequence ?? 0) - (rightMeeting?.sequence ?? 0)
  })
  const currentAssignment = orderedAssignments.find((assignment) => {
    const startMs = new Date(assignment.reading_start_at).getTime()
    const endMs = effectiveAssignmentEndMs(
      assignment.reading_end_at,
      assignment.stopped_at,
    )
    return startMs <= nowMs && nowMs < endMs
  })
  const recentAssignment = [...orderedAssignments]
    .filter(
      (assignment) =>
        effectiveAssignmentEndMs(
          assignment.reading_end_at,
          assignment.stopped_at,
        ) <= nowMs,
    )
    .sort(
      (left, right) =>
        effectiveAssignmentEndMs(right.reading_end_at, right.stopped_at) -
        effectiveAssignmentEndMs(left.reading_end_at, left.stopped_at),
    )[0]
  const upcomingAssignment = orderedAssignments
    .filter((assignment) => new Date(assignment.reading_start_at).getTime() > nowMs)
    .sort(
      (left, right) =>
        new Date(left.reading_start_at).getTime() -
        new Date(right.reading_start_at).getTime(),
    )[0]
  const defaultAssignment =
    currentAssignment ?? upcomingAssignment ?? recentAssignment
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(
    defaultAssignment?.id ?? "",
  )
  const selectedAssignment =
    orderedAssignments.find(
      (assignment) => assignment.id === selectedAssignmentId,
    ) ?? defaultAssignment

  if (!selectedAssignment) {
    return (
      <section
        className="rounded-lg bg-theme-tertiary p-4"
        aria-labelledby="reading-progress-heading"
      >
        <h2 id="reading-progress-heading" className="font-semibold text-theme-primary">
          회차별 독서 진행
        </h2>
        <p className="mt-2 text-sm text-theme-secondary">
          읽기 기간이 설정된 회차가 아직 없습니다.
        </p>
      </section>
    )
  }

  const selectedMeeting = meetingsById.get(selectedAssignment.meeting_id)
  const selectedBook = booksById.get(selectedAssignment.group_book_id)
  const selectedAttributions = attributions.filter(
    (item) =>
      item.meeting_book_assignment_id === selectedAssignment.id,
  )
  const selectedAssignmentStartMs = new Date(
    selectedAssignment.reading_start_at,
  ).getTime()
  const selectedAssignmentEndMs = effectiveAssignmentEndMs(
    selectedAssignment.reading_end_at,
    selectedAssignment.stopped_at,
  )
  const displayedSeconds = (item: GroupReadingAttribution) =>
    Math.min(
      item.counted_seconds,
      calculateHalfOpenOverlapSeconds(
        new Date(item.session_start_at).getTime(),
        new Date(item.session_end_at).getTime(),
        selectedAssignmentStartMs,
        selectedAssignmentEndMs,
      ),
    )
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
  const activeMembers = members.filter(
    (member) => member.status === "active" && member.user_id,
  )
  const activeMemberUserIds = useMemo(
    () =>
      activeMembers
        .map((member) => member.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    [activeMembers],
  )
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
          Object.fromEntries(entries.filter(([, displayName]) => Boolean(displayName))),
        )
      })
      .catch(() => {
        if (!cancelled) setUserDisplayNames({})
      })
    return () => {
      cancelled = true
    }
  }, [activeMemberUserIds])
  const rankings = activeMembers
    .map((member) => ({
      id: member.id,
      name:
        (member.user_id ? userDisplayNames[member.user_id] : "") ||
        member.display_name,
      seconds: totalsByUser.get(member.user_id!) ?? 0,
    }))
    .sort(
      (left, right) =>
        right.seconds - left.seconds || left.name.localeCompare(right.name, "ko"),
    )
  const isSelectedCurrent = selectedAssignment.id === currentAssignment?.id
  const assignmentOptions: SelectOption[] = orderedAssignments.map((assignment) => {
    const meeting = meetingsById.get(assignment.meeting_id)
    return {
      value: assignment.id,
      label: meeting ? `${meeting.sequence}회 · ${meeting.title}` : "회차 정보 없음",
    }
  })
  const selectedRange = inclusiveReadingDateRange(
    selectedAssignment.reading_start_at,
    selectedAssignment.reading_end_at,
    timeZone,
  )
  const selectedStoppedDate = selectedAssignment.stopped_at
    ? groupDateKey(selectedAssignment.stopped_at, timeZone)
    : undefined

  return (
    <section
      className="rounded-lg bg-theme-tertiary p-4"
      aria-labelledby="reading-progress-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="reading-progress-heading" className="font-semibold text-theme-primary">
            회차별 독서 진행
          </h2>
          {!currentAssignment && (
            <p className="mt-1 text-xs text-theme-secondary">
              {upcomingAssignment
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
        value={selectedAssignment.id}
        onChangeAction={setSelectedAssignmentId}
        options={assignmentOptions}
        className="mt-1"
        triggerClassName="min-h-11 bg-theme-secondary"
        aria-label="독서 진행 회차"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-theme-secondary p-3">
          <p className="text-xs text-theme-secondary">회차 책</p>
          <p className="mt-1 font-semibold text-theme-primary">
            {selectedAssignment.book_title_snapshot ??
              selectedBook?.title ??
              "책 정보 없음"}
          </p>
        </div>
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
                ? formatRemaining(selectedAssignment.reading_end_at, nowMs)
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
            자동 귀속 {selectedAttributions.length}건
          </p>
        </div>
      </div>

      <h3 className="mt-5 text-sm font-semibold text-theme-primary">
        멤버별 누적 순위
      </h3>
      {rankings.length ? (
        <ol className="mt-2 space-y-2">
          {rankings.map((ranking, index) => (
            <li
              key={ranking.id}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-theme-secondary px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-theme-primary">
                <span className="mr-2 font-bold text-accent-theme">{index + 1}</span>
                {ranking.name}
              </span>
              <span className="shrink-0 text-sm font-semibold text-theme-primary">
                {formatDuration(ranking.seconds)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-theme-secondary">
          순위를 표시할 활동 멤버가 없습니다.
        </p>
      )}
    </section>
  )
}
