"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BookOpenText,
  HelpCircle,
  PenSquare,
  Plus,
  Star,
  TicketCheck,
  Users,
} from "lucide-react"
import FormModalFrame from "@/components/FormModalFrame"
import { useAuth } from "@/contexts/AuthContext"
import { queryKeys } from "@/lib/queryKeys"
import { ReadingGroupService } from "@/services/readingGroupService"
import type { GroupMemberKind, ReadingGroup } from "@/types/readingGroup"
import { GROUP_MEMBER_KIND_LABELS } from "@/utils/groupMemberLabels"

const RECORD_LINKS = [
  {
    href: "/record/quotes",
    title: "구절 기록",
    description: "인상 깊은 구절 기록",
    icon: PenSquare,
    color: "text-blue-600 dark:text-blue-400",
    background: "bg-blue-100 dark:bg-blue-900/20",
  },
  {
    href: "/record/questions",
    title: "독서 질문",
    description: "책에 대한 질문",
    icon: HelpCircle,
    color: "text-green-600 dark:text-green-400",
    background: "bg-green-100 dark:bg-green-900/20",
  },
  {
    href: "/record/reviews",
    title: "리뷰",
    description: "책에 대한 리뷰",
    icon: Star,
    color: "text-yellow-600 dark:text-yellow-400",
    background: "bg-yellow-100 dark:bg-yellow-900/20",
  },
  {
    href: "/record/critiques",
    title: "서평",
    description: "책에 대한 서평",
    icon: BookOpenText,
    color: "text-purple-600 dark:text-purple-400",
    background: "bg-purple-100 dark:bg-purple-900/20",
  },
] as const

const STATUS_LABELS: Record<ReadingGroup["status"], string> = {
  active: "활동 중",
  paused: "일시 중지",
  archived: "종료",
}

function ActivityHubSkeleton() {
  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto animate-pulse px-4 py-6">
        <div className="mb-3 h-9 w-36 rounded bg-theme-tertiary" />
        <div className="mb-6 h-5 w-64 rounded bg-theme-tertiary" />
        <div className="mb-6 h-11 rounded-lg bg-theme-tertiary" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 rounded-lg bg-theme-tertiary" />
          ))}
        </div>
      </div>
    </div>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다."
}

function ActivityHub() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { isLoggedIn, loading, user, userData, userUid } = useAuth()
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [joinMemberKind, setJoinMemberKind] =
    useState<GroupMemberKind>("participant")
  const view = searchParams.get("view") === "groups" ? "groups" : "records"

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login")
    }
  }, [isLoggedIn, loading, router])

  const groupsQuery = useQuery({
    queryKey: queryKeys.readingGroups.mine(userUid),
    queryFn: () => ReadingGroupService.getMyGroups(userUid!),
    enabled: Boolean(userUid && view === "groups"),
  })

  const browseQuery = useQuery({
    queryKey: queryKeys.readingGroups.browse.list(userUid),
    queryFn: () => ReadingGroupService.browseGroups(),
    enabled: Boolean(userUid && view === "groups"),
  })

  const joinMutation = useMutation({
    mutationFn: () =>
      ReadingGroupService.joinGroupByInviteCode(
        inviteCode.trim().toUpperCase(),
        userUid!,
        userData?.displayName?.trim() ||
          user?.displayName?.trim() ||
          user?.email?.split("@")[0] ||
          "모임원",
        joinMemberKind,
      ),
    onSuccess: async (group) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.mine(userUid),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.browse.all,
      })
      setIsJoinOpen(false)
      setInviteCode("")
      setJoinMemberKind("participant")
      router.push(`/groups/${group.id}`)
    },
  })

  if (loading) {
    return <ActivityHubSkeleton />
  }

  if (!isLoggedIn) {
    return null
  }

  const changeView = (nextView: "records" | "groups") => {
    router.replace(`/record?view=${nextView}`, { scroll: false })
  }

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!inviteCode.trim() || joinMutation.isPending) return
    joinMutation.mutate()
  }
  const browseById = new Map(
    (browseQuery.data ?? []).map((group) => [group.id, group]),
  )
  const otherGroups = (browseQuery.data ?? []).filter(
    (group) => !group.is_member,
  )

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-5">
          <h1 className="mb-2 text-3xl font-bold text-theme-primary">
            활동
          </h1>
          <p className="text-sm text-theme-secondary">
            나의 독서 기록과 함께하는 독서모임을 확인하세요.
          </p>
        </header>

        <div
          className="mb-6 grid grid-cols-2 rounded-lg bg-theme-tertiary p-1"
          role="tablist"
          aria-label="활동 보기"
        >
          <button
            id="records-tab"
            type="button"
            role="tab"
            aria-selected={view === "records"}
            aria-controls="activity-panel"
            onClick={() => changeView("records")}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              view === "records"
                ? "bg-theme-secondary text-theme-primary shadow-sm"
                : "text-theme-secondary"
            }`}
          >
            내 기록
          </button>
          <button
            id="groups-tab"
            type="button"
            role="tab"
            aria-selected={view === "groups"}
            aria-controls="activity-panel"
            onClick={() => changeView("groups")}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              view === "groups"
                ? "bg-theme-secondary text-theme-primary shadow-sm"
                : "text-theme-secondary"
            }`}
          >
            독서모임
          </button>
        </div>

        <section
          id="activity-panel"
          role="tabpanel"
          aria-labelledby={view === "records" ? "records-tab" : "groups-tab"}
        >
          {view === "records" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {RECORD_LINKS.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg border-card bg-theme-secondary p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <span className={`shrink-0 rounded-lg p-3 ${item.background}`}>
                      <Icon className={`h-6 w-6 ${item.color}`} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-semibold text-theme-primary">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm text-theme-secondary">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-theme-primary">내 독서모임</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      joinMutation.reset()
                      setIsJoinOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-theme-tertiary bg-theme-secondary px-3 py-2 text-sm font-medium text-theme-primary"
                  >
                    <TicketCheck className="h-4 w-4" aria-hidden />
                    초대코드 가입
                  </button>
                  <Link
                    href="/groups/new"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-theme px-3 py-2 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    모임 만들기
                  </Link>
                </div>
              </div>

              {groupsQuery.isLoading ? (
                <div className="grid animate-pulse gap-3 sm:grid-cols-2" aria-label="모임 불러오는 중">
                  {[0, 1].map((item) => (
                    <div key={item} className="h-36 rounded-lg bg-theme-tertiary" />
                  ))}
                </div>
              ) : groupsQuery.isError ? (
                <div className="rounded-lg border-card bg-theme-secondary p-6 text-center">
                  <p className="mb-3 text-sm text-red-600" role="alert">
                    {getErrorMessage(groupsQuery.error)}
                  </p>
                  <button
                    type="button"
                    onClick={() => groupsQuery.refetch()}
                    className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
                  >
                    다시 시도
                  </button>
                </div>
              ) : groupsQuery.data?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {groupsQuery.data.map((group) => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="rounded-lg border-card bg-theme-secondary p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-theme-primary">
                          {group.name}
                        </h3>
                        <span className="shrink-0 rounded-full bg-theme-tertiary px-2.5 py-1 text-xs font-medium text-theme-secondary">
                          {STATUS_LABELS[group.status]}
                        </span>
                      </div>
                      <p className="mb-3 line-clamp-2 text-sm text-theme-secondary">
                        {group.description || "모임 소개가 아직 없습니다."}
                      </p>
                      <p className="text-xs text-theme-secondary">
                        참여 대상:{" "}
                        {group.audience_levels.length
                          ? group.audience_levels.join(", ")
                          : "전체"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-theme-secondary">
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        활동 멤버{" "}
                        {browseQuery.isLoading
                          ? "확인 중..."
                          : browseById.has(group.id)
                            ? `${browseById.get(group.id)!.active_member_count}명`
                            : "확인 불가"}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border-card bg-theme-secondary p-8 text-center">
                  <Users className="mx-auto mb-3 h-9 w-9 text-theme-secondary" aria-hidden />
                  <h3 className="mb-1 font-semibold text-theme-primary">
                    참여 중인 독서모임이 없습니다
                  </h3>
                  <p className="text-sm text-theme-secondary">
                    새 모임을 만들거나 초대코드로 가입해 보세요.
                  </p>
                </div>
              )}

              <section className="mt-8" aria-labelledby="browse-groups-heading">
                <div className="mb-4">
                  <h2
                    id="browse-groups-heading"
                    className="text-xl font-semibold text-theme-primary"
                  >
                    다른 모임 둘러보기
                  </h2>
                  <p className="mt-1 text-sm text-theme-secondary">
                    가입 전에도 모임의 공개 일정과 운영 안내를 살펴볼 수 있습니다.
                  </p>
                </div>
                {browseQuery.isLoading ? (
                  <div
                    className="grid animate-pulse gap-3 sm:grid-cols-2"
                    aria-label="다른 모임 불러오는 중"
                  >
                    {[0, 1].map((item) => (
                      <div key={item} className="h-36 rounded-lg bg-theme-tertiary" />
                    ))}
                  </div>
                ) : browseQuery.isError ? (
                  <div className="rounded-lg border-card bg-theme-secondary p-5">
                    <p className="text-sm text-theme-secondary" role="alert">
                      다른 모임 목록을 불러오지 못했습니다. 내 독서모임은 계속 이용할 수
                      있습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => browseQuery.refetch()}
                      className="mt-3 rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
                    >
                      다시 시도
                    </button>
                  </div>
                ) : otherGroups.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {otherGroups.map((group) => (
                      <Link
                        key={group.id}
                        href={`/groups/${group.id}`}
                        className="rounded-lg border-card bg-theme-secondary p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-lg font-semibold text-theme-primary">
                            {group.name}
                          </h3>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <span className="rounded-full bg-theme-tertiary px-2.5 py-1 text-xs font-medium text-theme-secondary">
                              {STATUS_LABELS[group.status]}
                            </span>
                            <span className="rounded-full bg-accent-theme/10 px-2.5 py-1 text-xs font-semibold text-accent-theme">
                              읽기 전용
                            </span>
                          </div>
                        </div>
                        <p className="mb-3 line-clamp-2 text-sm text-theme-secondary">
                          {group.description || "모임 소개가 아직 없습니다."}
                        </p>
                        <p className="text-xs text-theme-secondary">
                          참여 대상:{" "}
                          {group.audience_levels.length
                            ? group.audience_levels.join(", ")
                            : "전체"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-theme-secondary">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          활동 멤버 {group.active_member_count}명
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border-card bg-theme-secondary p-6 text-center text-sm text-theme-secondary">
                    둘러볼 수 있는 다른 모임이 없습니다.
                  </div>
                )}
              </section>
            </div>
          )}
        </section>

        <FormModalFrame
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
          title="초대코드로 가입"
          interactionLocked={joinMutation.isPending}
        >
          <form onSubmit={handleJoin}>
            <label htmlFor="invite-code" className="mb-2 block text-sm font-medium text-theme-primary">
              초대코드
            </label>
            <input
              id="invite-code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              autoComplete="off"
              autoFocus
              maxLength={8}
              required
              placeholder="8자리 초대코드"
              className="form-control"
            />

            <fieldset className="mt-4 space-y-2">
              <legend className="mb-2 text-sm font-medium text-theme-primary">
                참여 유형
              </legend>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-theme-tertiary bg-theme-tertiary/40 p-3">
                <input
                  type="radio"
                  name="join-member-kind"
                  value="participant"
                  checked={joinMemberKind === "participant"}
                  onChange={() => setJoinMemberKind("participant")}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-theme-primary">
                    {GROUP_MEMBER_KIND_LABELS.participant}
                  </span>
                  <span className="mt-0.5 block text-xs text-theme-secondary">
                    직접 책을 읽고 회차 독서에 참여합니다.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-theme-tertiary bg-theme-tertiary/40 p-3">
                <input
                  type="radio"
                  name="join-member-kind"
                  value="guardian"
                  checked={joinMemberKind === "guardian"}
                  onChange={() => setJoinMemberKind("guardian")}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-theme-primary">
                    {GROUP_MEMBER_KIND_LABELS.guardian}
                  </span>
                  <span className="mt-0.5 block text-xs text-theme-secondary">
                    학부모 등 함께 보지만, 직접 읽지는 않는 역할입니다.
                  </span>
                </span>
              </label>
            </fieldset>

            {joinMutation.isError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {getErrorMessage(joinMutation.error)}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsJoinOpen(false)
                  setJoinMemberKind("participant")
                }}
                disabled={joinMutation.isPending}
                className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!inviteCode.trim() || joinMutation.isPending}
                className="rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {joinMutation.isPending ? "가입 중..." : "가입하기"}
              </button>
            </div>
          </form>
        </FormModalFrame>
      </div>
    </div>
  )
}

export default function RecordPage() {
  return (
    <Suspense fallback={<ActivityHubSkeleton />}>
      <ActivityHub />
    </Suspense>
  )
}
