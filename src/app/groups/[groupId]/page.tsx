"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Copy,
  Info,
  LayoutDashboard,
  Users,
} from "lucide-react"
import GroupBooksPanel from "@/components/reading-groups/GroupBooksPanel"
import GroupInfoPanel from "@/components/reading-groups/GroupInfoPanel"
import GroupMeetingRecordsPanel from "@/components/reading-groups/GroupMeetingRecordsPanel"
import GroupPostsPanel from "@/components/reading-groups/GroupPostsPanel"
import GroupReadingProgress from "@/components/reading-groups/GroupReadingProgress"
import GroupSchedulePanel from "@/components/reading-groups/GroupSchedulePanel"
import PublicGroupDetail from "@/components/reading-groups/PublicGroupDetail"
import { useAuth } from "@/contexts/AuthContext"
import { queryKeys } from "@/lib/queryKeys"
import { ReadingGroupService } from "@/services/readingGroupService"
import type {
  GroupMeeting,
  GroupBook,
  MeetingBookAssignment,
  ReadingGroup,
} from "@/types/readingGroup"
import {
  effectiveGroupMeetingPhase,
  GROUP_MEETING_PHASE_LABELS,
} from "@/utils/readingGroupDates"

type TabId = "home" | "schedule" | "books" | "records" | "info"
type RecordsTabId = "meetings" | "posts"

const TABS = [
  { id: "home", label: "홈", icon: LayoutDashboard },
  { id: "schedule", label: "일정", icon: CalendarDays },
  { id: "books", label: "책장", icon: BookOpen },
  { id: "records", label: "기록", icon: ClipboardList },
  { id: "info", label: "정보", icon: Info },
] as const

const STATUS_LABELS: Record<ReadingGroup["status"], string> = {
  active: "활동 중",
  paused: "일시 중지",
  archived: "종료",
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto max-w-4xl animate-pulse px-4 py-6">
        <div className="mb-5 h-5 w-28 rounded bg-theme-tertiary" />
        <div className="mb-5 h-40 rounded-xl bg-theme-tertiary" />
        <div className="mb-5 h-12 rounded-lg bg-theme-tertiary" />
        <div className="h-56 rounded-xl bg-theme-tertiary" />
      </div>
    </div>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-theme-tertiary p-8 text-center text-sm text-theme-secondary">
      {children}
    </div>
  )
}

function formatDate(value: string, timeZone: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date)
}

function MeetingList({
  meetings,
  assignments = [],
  books = [],
  timeZone,
  now,
}: {
  meetings: GroupMeeting[]
  assignments?: MeetingBookAssignment[]
  books?: GroupBook[]
  timeZone: string
  now: Date
}) {
  if (!meetings.length) return <EmptyState>등록된 모임 일정이 없습니다.</EmptyState>
  const assignmentsByMeeting = new Map<string, MeetingBookAssignment[]>()
  assignments.forEach((assignment) => {
    assignmentsByMeeting.set(assignment.meeting_id, [
      ...(assignmentsByMeeting.get(assignment.meeting_id) ?? []),
      assignment,
    ])
  })
  const booksById = new Map(books.map((book) => [book.id, book]))
  return (
    <ul className="space-y-3">
      {meetings.map((meeting) => {
        const meetingAssignments = assignmentsByMeeting.get(meeting.id) ?? []
        const periodAssignment = meetingAssignments[0]
        const phase = effectiveGroupMeetingPhase({
          status: meeting.status,
          scheduledAt: meeting.scheduled_at,
          readingStartAt: periodAssignment?.reading_start_at,
          readingEndAt: periodAssignment?.reading_end_at,
          now,
        })
        return (
          <li key={meeting.id} className="rounded-xl bg-theme-tertiary p-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-theme-primary">
                {meeting.sequence}회 · {meeting.title}
              </h3>
              <span className="rounded-full bg-theme-secondary px-2.5 py-0.5 text-xs text-theme-secondary">
                {GROUP_MEETING_PHASE_LABELS[phase]}
              </span>
            </div>
            <p className="text-sm text-theme-secondary">
              {formatDate(meeting.scheduled_at, timeZone)}
            </p>
            {meeting.location && (
              <p className="mt-1 text-sm text-theme-secondary">{meeting.location}</p>
            )}
            {meetingAssignments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {meetingAssignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="text-sm text-theme-primary"
                  >
                    『
                    {assignment.book_title_snapshot ??
                      booksById.get(assignment.group_book_id)?.title ??
                      "책 정보 없음"}
                    』
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function ReadingGroupDetailPage() {
  const router = useRouter()
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId
  const { isLoggedIn, loading, userUid, userData, user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>("home")
  const [activeRecordsTab, setActiveRecordsTab] = useState<RecordsTabId>("meetings")
  const [phaseNow, setPhaseNow] = useState(() => new Date())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login")
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    const timer = window.setInterval(() => setPhaseNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const browseDetailQuery = useQuery({
    queryKey: queryKeys.readingGroups.browse.detail(groupId, userUid),
    enabled: Boolean(groupId && userUid),
    queryFn: () => ReadingGroupService.browseGroupDetail(groupId),
  })

  const detailQuery = useQuery({
    queryKey: [...queryKeys.readingGroups.detail(groupId), userUid],
    enabled: Boolean(
      groupId && userUid && browseDetailQuery.data?.group.is_member,
    ),
    queryFn: async () => {
      const [group, membership] = await Promise.all([
        ReadingGroupService.getGroup(groupId),
        ReadingGroupService.getMember(`${groupId}__${userUid}`),
      ])
      if (!group) throw new Error("독서모임을 찾을 수 없습니다.")
      if (!membership || membership.status !== "active") {
        throw new Error("이 독서모임을 볼 수 있는 활동 멤버가 아닙니다.")
      }

      const [
        members,
        books,
        meetings,
        assignments,
        meetingRecords,
        posts,
        attributions,
      ] = await Promise.all([
        ReadingGroupService.getGroupMembers(groupId),
        ReadingGroupService.getGroupBooks(groupId),
        ReadingGroupService.getGroupMeetings(groupId),
        ReadingGroupService.getGroupMeetingBookAssignments(groupId),
        ReadingGroupService.getGroupMeetingRecords(groupId),
        ReadingGroupService.getGroupPosts(groupId),
        ReadingGroupService.getGroupReadingAttributions(groupId),
      ])
      return {
        group,
        membership,
        members,
        books,
        meetings,
        assignments,
        meetingRecords,
        posts,
        attributions,
      }
    },
  })

  const memberDetailLoading =
    browseDetailQuery.data?.group.is_member && detailQuery.isLoading
  if (loading || browseDetailQuery.isLoading || memberDetailLoading) {
    return <DetailSkeleton />
  }
  if (!isLoggedIn || !userUid) return null

  const detailError = browseDetailQuery.error ?? detailQuery.error
  if (detailError) {
    return (
      <main className="min-h-screen bg-theme-gradient pb-24">
        <div className="container mx-auto max-w-xl px-4 py-16 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-theme-secondary" aria-hidden />
          <h1 className="mb-2 text-xl font-bold text-theme-primary">
            모임을 열 수 없습니다
          </h1>
          <p className="mb-5 text-sm text-theme-secondary" role="alert">
            {detailError instanceof Error
              ? detailError.message
              : "독서모임 정보를 불러오지 못했습니다."}
          </p>
          <Link
            href="/record?view=groups"
            className="inline-flex rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white"
          >
            내 독서모임으로
          </Link>
        </div>
      </main>
    )
  }

  if (
    browseDetailQuery.data &&
    !browseDetailQuery.data.group.is_member
  ) {
    return <PublicGroupDetail detail={browseDetailQuery.data} />
  }
  if (!detailQuery.data) return null

  const {
    group,
    membership,
    members,
    books,
    meetings,
    assignments,
    meetingRecords,
    posts,
    attributions,
  } = detailQuery.data
  const isOwner =
    group.owner_user_id === userUid &&
    membership.role === "owner" &&
    membership.status === "active"
  const upcomingMeetings = meetings.filter(
    (meeting) =>
      new Date(meeting.scheduled_at).getTime() >= phaseNow.getTime() &&
      !["completed", "cancelled"].includes(meeting.status),
  )
  const displayName =
    membership.display_name ||
    userData?.displayName ||
    user?.displayName ||
    "모임원"

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <main className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Link
          href="/record?view=groups"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-theme-secondary hover:text-theme-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          내 독서모임
        </Link>

        <header className="mb-5 rounded-xl border-card bg-theme-secondary p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h1 className="text-2xl font-bold text-theme-primary">{group.name}</h1>
                <span className="rounded-full bg-theme-tertiary px-2.5 py-1 text-xs text-theme-secondary">
                  {STATUS_LABELS[group.status]}
                </span>
              </div>
              <p className="text-sm text-theme-secondary">
                {group.description || "모임 소개가 아직 없습니다."}
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={copyInviteCode}
                className="inline-flex items-center gap-2 rounded-lg bg-theme-tertiary px-3 py-2 text-sm font-medium text-theme-primary"
                aria-label={`초대코드 ${group.invite_code} 복사`}
              >
                <Copy className="h-4 w-4" aria-hidden />
                {copied ? "복사됨" : `초대코드 ${group.invite_code}`}
              </button>
            )}
          </div>
          <p className="text-xs text-theme-secondary">
            참여 대상:{" "}
            {group.audience_levels.length ? group.audience_levels.join(", ") : "전체"}
          </p>
        </header>

        <div
          className="mb-5 grid grid-cols-5 overflow-hidden rounded-lg bg-theme-tertiary p-1"
          role="tablist"
          aria-label="독서모임 메뉴"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                id={`group-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="group-tab-panel"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-xs font-medium transition-colors sm:flex-row sm:justify-center sm:text-sm ${
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
          id="group-tab-panel"
          role="tabpanel"
          aria-labelledby={`group-${activeTab}-tab`}
          className="rounded-xl border-card bg-theme-secondary p-4 shadow-sm sm:p-6"
        >
          {activeTab === "home" && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-theme-primary">
                모임 한눈에 보기
              </h2>
              <div className="mb-6 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "멤버",
                    value: `${members.filter((item) => item.status === "active").length}명`,
                    icon: Users,
                  },
                  {
                    label: "책",
                    value: `${books.length}권`,
                    icon: BookOpen,
                  },
                  {
                    label: "예정 일정",
                    value: `${upcomingMeetings.length}개`,
                    icon: CalendarDays,
                  },
                ].map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.label}
                      className="rounded-xl bg-theme-tertiary px-3 py-3.5 text-center"
                    >
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-theme-secondary text-accent-theme">
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                      <p className="mt-2 text-xs text-theme-secondary">{stat.label}</p>
                      <p className="mt-0.5 text-lg font-bold text-theme-primary">
                        {stat.value}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="mb-6">
                <GroupReadingProgress
                  meetings={meetings}
                  assignments={assignments}
                  books={books}
                  attributions={attributions}
                  members={members}
                  timeZone={group.time_zone}
                  onRefetch={detailQuery.refetch}
                  isRefreshing={detailQuery.isFetching}
                />
              </div>
              <h3 className="mb-3 font-semibold text-theme-primary">다가오는 일정</h3>
              <MeetingList
                meetings={upcomingMeetings.slice(0, 3)}
                assignments={assignments}
                books={books}
                timeZone={group.time_zone}
                now={phaseNow}
              />
            </div>
          )}

          {activeTab === "schedule" && (
            <GroupSchedulePanel
              group={group}
              meetings={meetings}
              books={books}
              assignments={assignments}
              isOwner={isOwner}
              onChangedAction={detailQuery.refetch}
            />
          )}

          {activeTab === "books" && (
            <GroupBooksPanel
              groupId={groupId}
              books={books}
              meetings={meetings}
              assignments={assignments}
              timeZone={group.time_zone}
              isOwner={isOwner}
              userUid={userUid}
              onChangedAction={detailQuery.refetch}
            />
          )}

          {activeTab === "records" && (
            <div className="space-y-6">
              <GroupReadingProgress
                meetings={meetings}
                assignments={assignments}
                books={books}
                attributions={attributions}
                members={members}
                timeZone={group.time_zone}
                onRefetch={detailQuery.refetch}
                isRefreshing={detailQuery.isFetching}
              />
              <div
                className="grid grid-cols-2 rounded-lg bg-theme-tertiary p-1"
                role="tablist"
                aria-label="기록 유형"
              >
                {[
                  { id: "meetings" as const, label: "회차 기록" },
                  { id: "posts" as const, label: "게시판" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    id={`group-records-${tab.id}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={activeRecordsTab === tab.id}
                    aria-controls="group-records-panel"
                    onClick={() => setActiveRecordsTab(tab.id)}
                    className={`rounded-md px-2 py-2 text-xs font-semibold sm:text-sm ${
                      activeRecordsTab === tab.id
                        ? "bg-theme-secondary text-theme-primary shadow-sm"
                        : "text-theme-secondary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                id="group-records-panel"
                role="tabpanel"
                aria-labelledby={`group-records-${activeRecordsTab}-tab`}
              >
                {activeRecordsTab === "meetings" && (
                  <GroupMeetingRecordsPanel
                    groupId={groupId}
                    meetings={meetings}
                    assignments={assignments}
                    books={books}
                    members={members}
                    initialRecords={meetingRecords}
                    isOwner={isOwner}
                    userUid={userUid}
                    timeZone={group.time_zone}
                    onChangedAction={detailQuery.refetch}
                  />
                )}
                {activeRecordsTab === "posts" && (
                  <GroupPostsPanel
                    groupId={groupId}
                    initialPosts={posts}
                    isOwner={isOwner}
                    userUid={userUid}
                    displayName={displayName}
                    onChangedAction={detailQuery.refetch}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === "info" && (
            <div className="space-y-5">
              <section className="rounded-lg bg-theme-tertiary p-4" aria-labelledby="operations-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 id="operations-heading" className="font-semibold text-theme-primary">
                      공지와 운영 문서
                    </h2>
                    <p className="mt-1 text-sm text-theme-secondary">
                      공지, 모임 규칙, 독서법, 토론 규칙을 기록 탭에서 확인하세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("records")}
                    className="rounded-lg bg-theme-secondary px-3 py-2 text-sm font-semibold text-theme-primary"
                  >
                    운영 문서 보기
                  </button>
                </div>
              </section>
              <GroupInfoPanel
                group={group}
                members={members}
                currentUserId={userUid}
                isOwner={isOwner}
                onChangedAction={detailQuery.refetch}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
