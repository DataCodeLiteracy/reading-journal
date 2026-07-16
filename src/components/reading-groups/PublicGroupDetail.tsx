"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Info,
  LayoutDashboard,
  MapPin,
  Users,
} from "lucide-react"
import type {
  BrowsableGroupMeeting,
  BrowsableReadingGroupDetail,
} from "@/types/readingGroup"
import {
  effectiveGroupMeetingPhase,
  GROUP_MEETING_PHASE_LABELS,
  groupDateKey,
  inclusiveReadingDateRange,
} from "@/utils/readingGroupDates"

type PublicTabId = "home" | "schedule" | "books" | "info"

const TABS = [
  { id: "home", label: "홈", icon: LayoutDashboard },
  { id: "schedule", label: "일정", icon: CalendarDays },
  { id: "books", label: "책", icon: BookOpen },
  { id: "info", label: "안내", icon: Info },
] as const

const GROUP_STATUS_LABELS = {
  active: "활동 중",
  paused: "일시 중지",
  archived: "종료",
} as const

const POST_TYPE_LABELS = {
  announcement: "공지",
  group_rule: "모임 규칙",
  reading_method: "독서 방법",
  discussion_rule: "토론 규칙",
} as const

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-theme-tertiary p-8 text-center text-sm text-theme-secondary">
      {children}
    </div>
  )
}

function formatDate(value: string | undefined, timeZone: string) {
  if (!value) return "일정 미정"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "일정 미정"
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }
}

export default function PublicGroupDetail({
  detail,
}: {
  detail: BrowsableReadingGroupDetail
}) {
  const [activeTab, setActiveTab] = useState<PublicTabId>("home")
  const [phaseNow, setPhaseNow] = useState(() => new Date())
  const { group, books, meetings, assignments, posts } = detail

  useEffect(() => {
    const timer = window.setInterval(() => setPhaseNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const booksById = new Map(books.map((book) => [book.id, book]))
  const assignmentsByMeeting = new Map<string, (typeof assignments)[number][]>()
  assignments.forEach((assignment) => {
    assignmentsByMeeting.set(assignment.meeting_id, [
      ...(assignmentsByMeeting.get(assignment.meeting_id) ?? []),
      assignment,
    ])
  })
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]))
  const assignmentsByBook = new Map(
    assignments.map((assignment) => [assignment.group_book_id, assignment]),
  )
  const publicBookStatus = (book: (typeof books)[number]) => {
    if (["completed", "paused", "reading_paused"].includes(book.status)) return book.status
    const assignment = assignmentsByBook.get(book.id)
    if (!assignment?.reading_start_at) return book.status
    if (meetingsById.get(assignment.meeting_id)?.status === "completed") return "completed"
    return phaseNow.getTime() >= new Date(assignment.reading_start_at).getTime()
      ? "reading"
      : "planned"
  }
  const upcomingMeetings = meetings.filter(
    (meeting) =>
      Boolean(meeting.scheduled_at) &&
      new Date(meeting.scheduled_at!).getTime() >= phaseNow.getTime() &&
      !["completed", "cancelled"].includes(meeting.status),
  )

  const renderMeetings = (items: BrowsableGroupMeeting[]) => {
    if (!items.length) return <EmptyState>공개된 모임 일정이 없습니다.</EmptyState>
    return (
      <ul className="space-y-3">
        {items.map((meeting) => {
          const meetingAssignments = assignmentsByMeeting.get(meeting.id) ?? []
          const periodAssignment = meetingAssignments[0]
          const phase = effectiveGroupMeetingPhase({
            status: meeting.status,
            scheduledAt: meeting.scheduled_at,
            readingStartAt: periodAssignment?.reading_start_at,
            readingEndAt: periodAssignment?.reading_end_at,
            now: phaseNow,
          })
          return (
            <li key={meeting.id} className="rounded-lg bg-theme-tertiary p-4">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-theme-primary">
                  {meeting.sequence ? `${meeting.sequence}회 · ` : ""}
                  {meeting.title}
                </h3>
                <span className="text-xs text-theme-secondary">
                  {GROUP_MEETING_PHASE_LABELS[phase]}
                </span>
              </div>
              <p className="text-sm text-theme-secondary">
                {formatDate(meeting.scheduled_at, group.time_zone)}
              </p>
              {meeting.location && (
                <p className="mt-1 flex items-center gap-1 text-sm text-theme-secondary">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {meeting.location}
                </p>
              )}
              {meeting.agenda && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-theme-secondary">
                  {meeting.agenda}
                </p>
              )}
              {meetingAssignments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {meetingAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-md bg-theme-secondary p-3 text-sm text-theme-secondary"
                    >
                      <p className="font-medium text-theme-primary">
                        『{assignment.book_title_snapshot ?? booksById.get(assignment.group_book_id)?.title ?? "책 정보 없음"}』
                      </p>
                      {assignment.reading_start_at && assignment.reading_end_at && (
                        <p className="mt-1 text-xs">
                          {(() => {
                            const range = inclusiveReadingDateRange(
                              assignment.reading_start_at,
                              assignment.reading_end_at,
                              group.time_zone,
                            )
                            const stoppedDate = assignment.stopped_at
                              ? groupDateKey(assignment.stopped_at, group.time_zone)
                              : undefined
                            return stoppedDate
                              ? `중단 ${range.startDate} ~ ${stoppedDate} · 원래 예정 ${range.startDate} ~ ${range.endDate}`
                              : `${range.startDate} ~ ${range.endDate}`
                          })()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <main className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Link
          href="/record?view=groups"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-theme-secondary hover:text-theme-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          독서모임 둘러보기
        </Link>

        <header className="mb-5 rounded-xl border-card bg-theme-secondary p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-theme-primary">{group.name}</h1>
                <span className="rounded-full bg-theme-tertiary px-2.5 py-1 text-xs text-theme-secondary">
                  {GROUP_STATUS_LABELS[group.status]}
                </span>
                <span className="rounded-full bg-accent-theme/10 px-2.5 py-1 text-xs font-semibold text-accent-theme">
                  읽기 전용
                </span>
              </div>
              <p className="text-sm text-theme-secondary">
                {group.description || "모임 소개가 아직 없습니다."}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-theme-tertiary px-3 py-2 text-sm text-theme-primary">
              <Users className="h-4 w-4" aria-hidden />
              활동 멤버 {group.active_member_count}명
            </span>
          </div>
          <p className="text-xs text-theme-secondary">
            참여 대상:{" "}
            {group.audience_levels.length ? group.audience_levels.join(", ") : "전체"}
          </p>
        </header>

        <div
          className="mb-5 grid grid-cols-4 overflow-hidden rounded-lg bg-theme-tertiary p-1"
          role="tablist"
          aria-label="공개 독서모임 메뉴"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                id={`public-group-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="public-group-tab-panel"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-xs font-medium sm:flex-row sm:justify-center sm:text-sm ${
                  selected
                    ? "bg-theme-secondary text-theme-primary shadow-sm"
                    : "text-theme-secondary"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {tab.label}
              </button>
            )
          })}
        </div>

        <section
          id="public-group-tab-panel"
          role="tabpanel"
          aria-labelledby={`public-group-${activeTab}-tab`}
          className="rounded-xl border-card bg-theme-secondary p-4 shadow-sm sm:p-6"
        >
          {activeTab === "home" && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-theme-primary">
                모임 한눈에 보기
              </h2>
              <div className="mb-6 grid grid-cols-3 gap-3">
                {[
                  ["활동 멤버", `${group.active_member_count}명`],
                  ["책", `${books.length}권`],
                  ["예정 일정", `${upcomingMeetings.length}개`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-theme-tertiary p-3 text-center">
                    <p className="text-xs text-theme-secondary">{label}</p>
                    <p className="mt-1 text-lg font-bold text-theme-primary">{value}</p>
                  </div>
                ))}
              </div>
              <h3 className="mb-3 font-semibold text-theme-primary">다가오는 일정</h3>
              {renderMeetings(upcomingMeetings.slice(0, 3))}
            </div>
          )}

          {activeTab === "schedule" && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-theme-primary">
                일정과 읽기 배정
              </h2>
              {renderMeetings(meetings)}
            </div>
          )}

          {activeTab === "books" && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-theme-primary">모임 책</h2>
              {books.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {books.map((book) => (
                    <li key={book.id} className="flex gap-3 rounded-lg bg-theme-tertiary p-4">
                      {book.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.cover_url}
                          alt=""
                          className="h-24 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-theme-secondary">
                          <BookOpen className="h-6 w-6 text-theme-secondary" aria-hidden />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-theme-primary">{book.title}</h3>
                        {book.author && (
                          <p className="mt-1 text-sm text-theme-secondary">{book.author}</p>
                        )}
                        <p className="mt-2 text-xs text-theme-secondary">
                          {{
                            planned: "예정",
                            on_hold: "선정 보류",
                            reading: "읽는 중",
                            reading_paused: "정지",
                            completed: "완료",
                            paused: "중단",
                          }[publicBookStatus(book)]}
                        </p>
                        {book.selected_reason && (
                          <p className="mt-2 line-clamp-3 text-sm text-theme-secondary">
                            {book.selected_reason}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>공개된 모임 책이 없습니다.</EmptyState>
              )}
            </div>
          )}

          {activeTab === "info" && (
            <div className="space-y-5">
              <section>
                <h2 className="mb-3 text-lg font-semibold text-theme-primary">
                  기본 안내
                </h2>
                <dl className="grid gap-3 rounded-lg bg-theme-tertiary p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-theme-secondary">기본 시간</dt>
                    <dd className="mt-1 font-medium text-theme-primary">
                      {group.default_weekday !== undefined
                        ? `${["일", "월", "화", "수", "목", "금", "토"][group.default_weekday] ?? "-"}요일`
                        : "미정"}
                      {group.default_time ? ` ${group.default_time}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-theme-secondary">기본 장소</dt>
                    <dd className="mt-1 font-medium text-theme-primary">
                      {group.default_location || "미정"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section>
                <h2 className="mb-3 text-lg font-semibold text-theme-primary">
                  공지와 운영 문서
                </h2>
                {posts.length ? (
                  <ul className="space-y-3">
                    {posts.map((post) => (
                      <li key={post.id} className="rounded-lg bg-theme-tertiary p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-theme-secondary px-2 py-1 text-xs text-theme-secondary">
                            {POST_TYPE_LABELS[post.type]}
                          </span>
                          {post.is_pinned && (
                            <span className="text-xs font-medium text-accent-theme">고정</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-theme-primary">{post.title}</h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-theme-secondary">
                          {post.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState>공개된 운영 안내가 없습니다.</EmptyState>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
