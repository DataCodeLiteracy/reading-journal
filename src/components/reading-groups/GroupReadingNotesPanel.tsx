"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Lock, NotebookPen } from "lucide-react"
import Select, { type SelectOption } from "@/components/Select"
import GroupMemberName from "@/components/reading-groups/GroupMemberName"
import { queryKeys } from "@/lib/queryKeys"
import { GroupReadingNotesService } from "@/services/groupReadingNotesService"
import type {
  GroupBook,
  GroupMember,
  GroupMeeting,
  GroupReadingNoteItem,
  GroupReadingNoteType,
  MeetingBookAssignment,
} from "@/types/readingGroup"

type Props = {
  groupId: string
  books: GroupBook[]
  meetings: GroupMeeting[]
  assignments: MeetingBookAssignment[]
  members: GroupMember[]
  viewerUserId: string
  initialMeetingId?: string
  initialGroupBookId?: string
  initialMemberUserId?: string
}

type SortKey = "newest" | "oldest" | "member" | "type"

const TYPE_LABEL: Record<GroupReadingNoteType, string> = {
  quote: "구절",
  question: "질문",
  review: "리뷰",
  critique: "서평",
}

const TYPE_BADGE: Record<GroupReadingNoteType, string> = {
  quote:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  question:
    "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  review:
    "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100",
  critique:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
}

const TYPE_FILTER: Array<{ id: "all" | GroupReadingNoteType; label: string }> =
  [
    { id: "all", label: "전체" },
    { id: "quote", label: "구절" },
    { id: "question", label: "질문" },
    { id: "review", label: "리뷰" },
    { id: "critique", label: "서평" },
  ]

function formatDate(value: Date) {
  if (Number.isNaN(value.getTime())) return ""
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(value)
}

function meetingLabel(meeting: GroupMeeting) {
  return `${meeting.sequence}회 · ${meeting.title}`
}

export default function GroupReadingNotesPanel({
  groupId,
  books,
  meetings,
  assignments,
  members,
  viewerUserId,
  initialMeetingId = "",
  initialGroupBookId = "",
  initialMemberUserId = "",
}: Props) {
  const [meetingFilter, setMeetingFilter] = useState(initialMeetingId)
  const [bookFilter, setBookFilter] = useState(initialGroupBookId)
  const [memberFilter, setMemberFilter] = useState(initialMemberUserId)
  const [typeFilter, setTypeFilter] = useState<"all" | GroupReadingNoteType>(
    "all",
  )
  const [sortKey, setSortKey] = useState<SortKey>("newest")

  const notesQuery = useQuery({
    queryKey: queryKeys.readingGroups.readingNotes(groupId),
    queryFn: () =>
      GroupReadingNotesService.getGroupReadingNotes({
        members,
        books,
        assignments,
        viewerUserId,
      }),
  })

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active" && member.user_id),
    [members],
  )

  const meetingOptions = useMemo<SelectOption<string>[]>(() => {
    const meetingIds = new Set(assignments.map((item) => item.meeting_id))
    const ordered = [...meetings]
      .filter((meeting) => meetingIds.has(meeting.id))
      .sort((a, b) => a.sequence - b.sequence)
    return [
      { value: "", label: "전체 회차" },
      ...ordered.map((meeting) => ({
        value: meeting.id,
        label: meetingLabel(meeting),
      })),
    ]
  }, [assignments, meetings])

  const bookOptions = useMemo<SelectOption<string>[]>(() => {
    const scopedAssignments = meetingFilter
      ? assignments.filter((item) => item.meeting_id === meetingFilter)
      : assignments
    const bookIds = new Set(scopedAssignments.map((item) => item.group_book_id))
    const scopedBooks = books.filter((book) => bookIds.has(book.id))
    return [
      { value: "", label: "전체 책" },
      ...scopedBooks.map((book) => ({ value: book.id, label: book.title })),
    ]
  }, [assignments, books, meetingFilter])

  const memberOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "전체 모임원" },
      ...activeMembers.map((member) => ({
        value: member.user_id!,
        label: member.display_name?.trim() || "모임원",
      })),
    ],
    [activeMembers],
  )

  const sortOptions: SelectOption<SortKey>[] = [
    { value: "newest", label: "최신순" },
    { value: "oldest", label: "오래된순" },
    { value: "member", label: "모임원 이름순" },
    { value: "type", label: "유형순" },
  ]

  const filteredNotes = useMemo(() => {
    let list = notesQuery.data ?? []

    if (meetingFilter) {
      list = list.filter((item) => item.meetingId === meetingFilter)
    }
    if (bookFilter) {
      list = list.filter((item) => item.groupBookId === bookFilter)
    }
    if (memberFilter) {
      list = list.filter((item) => item.userId === memberFilter)
    }
    if (typeFilter !== "all") {
      list = list.filter((item) => item.recordType === typeFilter)
    }

    const sorted = [...list]
    switch (sortKey) {
      case "oldest":
        sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        break
      case "member":
        sorted.sort(
          (a, b) =>
            a.displayName.localeCompare(b.displayName, "ko") ||
            b.createdAt.getTime() - a.createdAt.getTime(),
        )
        break
      case "type":
        sorted.sort(
          (a, b) =>
            TYPE_LABEL[a.recordType].localeCompare(TYPE_LABEL[b.recordType], "ko") ||
            b.createdAt.getTime() - a.createdAt.getTime(),
        )
        break
      default:
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }
    return sorted
  }, [
    notesQuery.data,
    meetingFilter,
    bookFilter,
    memberFilter,
    typeFilter,
    sortKey,
  ])

  const handleMeetingChange = (value: string) => {
    setMeetingFilter(value)
    if (bookFilter) {
      const stillValid = assignments.some(
        (item) =>
          item.group_book_id === bookFilter &&
          (!value || item.meeting_id === value),
      )
      if (!stillValid) setBookFilter("")
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-start gap-2">
        <NotebookPen
          className="mt-0.5 h-5 w-5 shrink-0 text-accent-theme"
          aria-hidden
        />
        <div>
          <h2 className="text-lg font-semibold text-theme-primary">독서 노트</h2>
          <p className="mt-1 text-xs text-theme-secondary">
            모임원이 같은 책에 남긴 구절·질문·리뷰·서평을 함께 볼 수 있어요.
            비공개 기록은 작성자 본인에게만 보입니다.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={meetingFilter}
          onChangeAction={handleMeetingChange}
          options={meetingOptions}
          aria-label="회차 필터"
          variant="toolbar"
        />
        <Select
          value={bookFilter}
          onChangeAction={setBookFilter}
          options={bookOptions}
          aria-label="책 필터"
          variant="toolbar"
        />
        <Select
          value={memberFilter}
          onChangeAction={setMemberFilter}
          options={memberOptions}
          aria-label="모임원 필터"
          variant="toolbar"
        />
        <Select
          value={sortKey}
          onChangeAction={setSortKey}
          options={sortOptions}
          aria-label="정렬"
          variant="toolbar"
        />
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5"
        role="group"
        aria-label="기록 유형 필터"
      >
        {TYPE_FILTER.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={typeFilter === option.id}
            onClick={() => setTypeFilter(option.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              typeFilter === option.id
                ? "bg-accent-theme text-white"
                : "bg-theme-tertiary text-theme-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notesQuery.isLoading ? (
        <p className="rounded-lg border border-dashed border-theme-tertiary p-5 text-center text-sm text-theme-secondary">
          독서 노트를 불러오는 중…
        </p>
      ) : notesQuery.isError ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          독서 노트를 불러오지 못했습니다.
        </p>
      ) : filteredNotes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-theme-tertiary p-5 text-center text-sm text-theme-secondary">
          {(notesQuery.data?.length ?? 0) === 0
            ? "아직 공유 가능한 독서 노트가 없습니다."
            : "선택한 조건에 맞는 독서 노트가 없습니다."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredNotes.map((item) => (
            <NoteCard
              key={item.id}
              item={item}
              member={activeMembers.find((member) => member.user_id === item.userId)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function NoteCard({
  item,
  member,
}: {
  item: GroupReadingNoteItem
  member?: GroupMember
}) {
  return (
    <li className="rounded-lg border border-theme-tertiary bg-theme-tertiary/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[item.recordType]}`}
        >
          {TYPE_LABEL[item.recordType]}
        </span>
        {!item.isPublic ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-theme-secondary px-2 py-0.5 text-[11px] text-theme-secondary">
            <Lock className="h-3 w-3" aria-hidden />
            나만 보기
          </span>
        ) : null}
        <span className="text-xs text-theme-secondary">{formatDate(item.createdAt)}</span>
      </div>
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {member ? (
          <GroupMemberName
            name={item.displayName}
            isOwner={member.role === "owner"}
            className="font-medium text-theme-primary"
          />
        ) : (
          <span className="font-medium text-theme-primary">{item.displayName}</span>
        )}
        <span className="text-theme-tertiary">·</span>
        <span className="truncate text-theme-secondary">{item.bookTitle}</span>
      </div>
      <Link
        href={item.detailHref}
        className="group block rounded-md transition-colors hover:bg-theme-secondary/60"
      >
        <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-theme-primary">
          {item.excerpt}
        </p>
        <span className="mt-1 inline-block text-xs font-medium text-accent-theme group-hover:underline">
          자세히 보기
        </span>
      </Link>
    </li>
  )
}
