"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2, UserMinus, UserPlus } from "lucide-react"
import ConfirmModal from "@/components/ConfirmModal"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import Select, { type SelectOption } from "@/components/Select"
import GroupMemberName from "@/components/reading-groups/GroupMemberName"
import { queryKeys } from "@/lib/queryKeys"
import { ReadingGroupService } from "@/services/readingGroupService"
import { UserService } from "@/services/userService"
import { BOOK_LEVELS, type BookLevel } from "@/types/book"
import type {
  GroupMember,
  ReadingGroup,
  ReadingGroupStatus,
  UpdateReadingGroupInput,
} from "@/types/readingGroup"
import {
  GROUP_MEMBER_ROLE_OPTION_LABELS,
  memberKindLabel,
  optionFromRoles,
  resolveMemberRoles,
  rolesFromOption,
  type GroupMemberRoleOption,
} from "@/utils/groupMemberLabels"

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]
const STATUS_OPTIONS: SelectOption<ReadingGroupStatus>[] = [
  { value: "active", label: "활동 중" },
  { value: "paused", label: "일시 중지" },
  { value: "archived", label: "종료" },
]
const WEEKDAY_OPTIONS: SelectOption[] = [
  { value: "", label: "미정" },
  ...WEEKDAYS.map((day, index) => ({
    value: String(index),
    label: `${day}요일`,
  })),
]
const MEMBER_ROLE_OPTIONS: SelectOption<GroupMemberRoleOption>[] = [
  { value: "participant", label: GROUP_MEMBER_ROLE_OPTION_LABELS.participant },
  { value: "guardian", label: GROUP_MEMBER_ROLE_OPTION_LABELS.guardian },
  { value: "both", label: GROUP_MEMBER_ROLE_OPTION_LABELS.both },
]

type GroupInfoPanelProps = {
  group: ReadingGroup
  members: GroupMember[]
  currentUserId: string
  isOwner: boolean
  onChangedAction: () => Promise<unknown>
}

type GroupFormState = {
  name: string
  description: string
  audienceLevels: BookLevel[]
  status: ReadingGroupStatus
  defaultWeekday: string
  defaultTime: string
  defaultLocation: string
}

function groupToForm(group: ReadingGroup): GroupFormState {
  return {
    name: group.name,
    description: group.description ?? "",
    audienceLevels: group.audience_levels,
    status: group.status,
    defaultWeekday:
      group.default_weekday === undefined ? "" : String(group.default_weekday),
    defaultTime: group.default_time ?? "",
    defaultLocation: group.default_location ?? "",
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function GroupInfoPanel({
  group,
  members,
  currentUserId,
  isOwner,
  onChangedAction,
}: GroupInfoPanelProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [groupForm, setGroupForm] = useState<GroupFormState>(() => groupToForm(group))
  const [offlineName, setOfflineName] = useState("")
  const [offlineMemberRole, setOfflineMemberRole] =
    useState<GroupMemberRoleOption>("participant")
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [validationError, setValidationError] = useState("")
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({})
  const [memberActionError, setMemberActionError] = useState("")
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)
  const [confirmIntent, setConfirmIntent] = useState<
    | { type: "transfer"; member: GroupMember }
    | { type: "remove-member"; member: GroupMember }
    | null
  >(null)

  useEffect(() => {
    if (!settingsOpen) setGroupForm(groupToForm(group))
  }, [group, settingsOpen])

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members],
  )
  const linkedMemberUserIds = useMemo(
    () =>
      activeMembers
        .map((member) => member.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    [activeMembers],
  )
  useEffect(() => {
    let cancelled = false
    if (!linkedMemberUserIds.length) {
      setUserDisplayNames({})
      return
    }
    void Promise.all(
      linkedMemberUserIds.map(async (userId) => {
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
  }, [linkedMemberUserIds])

  const memberLabel = (member: GroupMember) =>
    (member.user_id ? userDisplayNames[member.user_id] : "") || member.display_name

  const refreshGroupQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.detail(group.id),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.members(group.id),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.mine(currentUserId),
      }),
    ])
    await onChangedAction()
  }

  const updateMutation = useMutation({
    mutationFn: (input: UpdateReadingGroupInput) =>
      ReadingGroupService.updateGroup(group.id, input),
    onSuccess: async () => {
      setSettingsOpen(false)
      setValidationError("")
      await refreshGroupQueries()
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: ({
      displayName,
      roleOption,
    }: {
      displayName: string
      roleOption: GroupMemberRoleOption
    }) => {
      const roles = rolesFromOption(roleOption)
      const legacyKind =
        roles.includes("guardian") && !roles.includes("participant")
          ? "guardian"
          : "participant"
      return ReadingGroupService.addMember(group.id, {
        user_id: null,
        display_name: displayName,
        role: "member",
        member_kind: legacyKind,
        member_roles: roles,
        status: "active",
        joined_at: new Date().toISOString(),
      })
    },
    onSuccess: async () => {
      setOfflineName("")
      setOfflineMemberRole("participant")
      setMemberOpen(false)
      setValidationError("")
      await refreshGroupQueries()
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => ReadingGroupService.deleteMember(memberId),
    onSuccess: refreshGroupQueries,
  })

  const changeMemberRoles = async (
    member: GroupMember,
    roleOption: GroupMemberRoleOption,
  ) => {
    const nextRoles = rolesFromOption(roleOption)
    const current = resolveMemberRoles(member)
    const same =
      nextRoles.length === current.length &&
      nextRoles.every((role) => current.includes(role))
    if (same) return
    const legacyKind =
      nextRoles.includes("guardian") && !nextRoles.includes("participant")
        ? "guardian"
        : "participant"
    setBusyMemberId(member.id)
    setMemberActionError("")
    try {
      await ReadingGroupService.updateMember(member.id, {
        member_roles: nextRoles,
        member_kind: legacyKind,
        reads_for_user_id: null,
      })
      await refreshGroupQueries()
    } catch (error) {
      setMemberActionError(
        errorMessage(error, "참여 유형을 변경하지 못했습니다."),
      )
    } finally {
      setBusyMemberId(null)
    }
  }

  const transferOwnership = (member: GroupMember) => {
    if (!member.user_id || member.user_id === group.owner_user_id) return
    setConfirmIntent({ type: "transfer", member })
  }

  const executeTransferOwnership = async (member: GroupMember) => {
    if (!member.user_id) return
    setBusyMemberId(member.id)
    setMemberActionError("")
    try {
      await ReadingGroupService.transferOwnership(group.id, member.user_id)
      await refreshGroupQueries()
      setConfirmIntent(null)
    } catch (error) {
      setMemberActionError(
        errorMessage(error, "모임장 역할을 넘기지 못했습니다."),
      )
      setConfirmIntent(null)
    } finally {
      setBusyMemberId(null)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => ReadingGroupService.deleteGroup(group.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.all,
      })
      queryClient.removeQueries({
        queryKey: queryKeys.readingGroups.detail(group.id),
      })
      router.replace("/record?view=groups")
    },
  })

  const toggleLevel = (level: BookLevel) => {
    setGroupForm((current) => ({
      ...current,
      audienceLevels: current.audienceLevels.includes(level)
        ? current.audienceLevels.filter((item) => item !== level)
        : [...current.audienceLevels, level],
    }))
  }

  const submitSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = groupForm.name.trim()
    if (!name) {
      setValidationError("모임 이름을 입력해 주세요.")
      return
    }
    setValidationError("")
    updateMutation.mutate({
      name,
      description: groupForm.description.trim() || undefined,
      audience_levels: groupForm.audienceLevels,
      status: groupForm.status,
      default_weekday:
        groupForm.defaultWeekday === "" ? undefined : Number(groupForm.defaultWeekday),
      default_time: groupForm.defaultTime || undefined,
      default_location: groupForm.defaultLocation.trim() || undefined,
    })
  }

  const submitOfflineMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const displayName = offlineName.trim()
    if (!displayName) {
      setValidationError("멤버 표시명을 입력해 주세요.")
      return
    }
    setValidationError("")
    addMemberMutation.mutate({
      displayName,
      roleOption: offlineMemberRole,
    })
  }

  const removeMember = (member: GroupMember) => {
    if (member.user_id === group.owner_user_id || member.user_id === currentUserId) return
    setConfirmIntent({ type: "remove-member", member })
  }

  const settingsError =
    validationError ||
    (updateMutation.isError
      ? errorMessage(updateMutation.error, "모임 설정을 저장하지 못했습니다.")
      : "")
  const memberError =
    validationError ||
    (addMemberMutation.isError
      ? errorMessage(addMemberMutation.error, "오프라인 멤버를 추가하지 못했습니다.")
      : "")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-theme-primary">모임 정보</h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setValidationError("")
              setGroupForm(groupToForm(group))
              setSettingsOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-theme-tertiary px-3 py-2 text-sm font-medium text-theme-primary"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            설정 수정
          </button>
        )}
      </div>

      <section aria-labelledby="group-basics-heading">
        <h3 id="group-basics-heading" className="mb-3 font-semibold text-theme-primary">
          기본 정보
        </h3>
        <dl className="grid gap-4 rounded-lg bg-theme-tertiary p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-theme-secondary">모임 이름</dt>
            <dd className="mt-1 font-medium text-theme-primary">{group.name}</dd>
          </div>
          <div>
            <dt className="text-theme-secondary">상태</dt>
            <dd className="mt-1 font-medium text-theme-primary">
              {STATUS_OPTIONS.find((option) => option.value === group.status)?.label}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-theme-secondary">설명</dt>
            <dd className="mt-1 whitespace-pre-wrap font-medium text-theme-primary">
              {group.description || "등록된 설명이 없습니다."}
            </dd>
          </div>
          <div>
            <dt className="text-theme-secondary">참여 대상</dt>
            <dd className="mt-1 font-medium text-theme-primary">
              {group.audience_levels.length ? group.audience_levels.join(", ") : "전체"}
            </dd>
          </div>
          <div>
            <dt className="text-theme-secondary">공개 범위</dt>
            <dd className="mt-1 font-medium text-theme-primary">
              {group.visibility === "private" ? "비공개" : "공개"}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="group-schedule-heading">
        <h3 id="group-schedule-heading" className="mb-3 font-semibold text-theme-primary">
          기본 일정
        </h3>
        <dl className="grid gap-4 rounded-lg bg-theme-tertiary p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-theme-secondary">요일</dt>
            <dd className="mt-1 font-medium text-theme-primary">
              {group.default_weekday === undefined
                ? "미정"
                : `${WEEKDAYS[group.default_weekday]}요일`}
            </dd>
          </div>
          <div>
            <dt className="text-theme-secondary">시간</dt>
            <dd className="mt-1 font-medium text-theme-primary">
              {group.default_time || "미정"}
            </dd>
          </div>
          <div>
            <dt className="text-theme-secondary">장소</dt>
            <dd className="mt-1 font-medium text-theme-primary">
              {group.default_location || "미정"}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="group-members-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="group-members-heading" className="font-semibold text-theme-primary">
            멤버 ({activeMembers.length}명)
          </h3>
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                setValidationError("")
                setOfflineMemberRole("participant")
                setMemberOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-theme px-3 py-2 text-sm font-semibold text-white"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              오프라인 멤버
            </button>
          )}
        </div>
        <ul className="divide-y divide-theme-tertiary overflow-hidden rounded-lg border border-theme-tertiary">
          {activeMembers.map((member) => {
            const isOwnerSelf =
              member.user_id === group.owner_user_id || member.role === "owner"
            const roleOption = optionFromRoles(resolveMemberRoles(member))
            const canEditRoles =
              isOwner || member.user_id === currentUserId
            return (
              <li
                key={member.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <GroupMemberName
                    name={memberLabel(member)}
                    isOwner={isOwnerSelf}
                  />
                  <p className="mt-1 text-xs text-theme-secondary">
                    {isOwnerSelf ? "모임장" : memberKindLabel(member)} ·{" "}
                    {member.user_id ? "계정 연결" : "오프라인"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canEditRoles && (
                    <div className="w-[9.5rem]">
                      <Select
                        value={roleOption}
                        onChangeAction={(nextOption) =>
                          void changeMemberRoles(member, nextOption)
                        }
                        options={MEMBER_ROLE_OPTIONS}
                        variant="compact"
                        disabled={busyMemberId === member.id}
                        aria-label={`${memberLabel(member)} 참여 유형`}
                      />
                    </div>
                  )}
                  {isOwner && !isOwnerSelf && member.user_id && (
                    <button
                      type="button"
                      onClick={() => void transferOwnership(member)}
                      disabled={busyMemberId === member.id}
                      className="inline-flex shrink-0 items-center rounded-md bg-theme-tertiary px-2 py-1.5 text-xs font-medium text-theme-primary disabled:opacity-50"
                    >
                      모임장 넘기기
                    </button>
                  )}
                  {isOwner && !isOwnerSelf && (
                    <button
                      type="button"
                      onClick={() => removeMember(member)}
                      disabled={
                        removeMemberMutation.isPending ||
                        busyMemberId === member.id
                      }
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/20"
                      aria-label={`${memberLabel(member)} 멤버 제거`}
                    >
                      <UserMinus className="h-4 w-4" aria-hidden />
                      제거
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {(removeMemberMutation.isError || memberActionError) && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {memberActionError ||
              errorMessage(
                removeMemberMutation.error,
                "멤버를 제거하지 못했습니다.",
              )}
          </p>
        )}
      </section>

      {isOwner && (
        <section className="rounded-lg border border-red-200 p-4 dark:border-red-900">
          <h3 className="font-semibold text-red-700 dark:text-red-400">위험 구역</h3>
          <p className="mt-1 text-sm text-theme-secondary">
            모임과 모든 연관 데이터가 영구적으로 삭제됩니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmation("")
              setDeleteOpen(true)
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            모임 삭제
          </button>
        </section>
      )}

      <FormModalFrame
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="모임 설정 수정"
        size="wide"
        interactionLocked={updateMutation.isPending}
      >
        <form onSubmit={submitSettings} className="space-y-5" aria-busy={updateMutation.isPending}>
          <div>
            <label htmlFor="edit-group-name" className="mb-1.5 block text-sm font-semibold text-theme-primary">
              모임 이름
            </label>
            <input
              id="edit-group-name"
              value={groupForm.name}
              onChange={(event) =>
                setGroupForm((current) => ({ ...current, name: event.target.value }))
              }
              required
              maxLength={60}
              className="form-control"
            />
          </div>
          <div>
            <label htmlFor="edit-group-description" className="mb-1.5 block text-sm font-semibold text-theme-primary">
              설명
            </label>
            <textarea
              id="edit-group-description"
              value={groupForm.description}
              onChange={(event) =>
                setGroupForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              maxLength={500}
              className="form-control form-control-textarea"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-theme-primary">참여 대상</legend>
            <div className="flex flex-wrap gap-2">
              {BOOK_LEVELS.map((level) => {
                const selected = groupForm.audienceLevels.includes(level)
                return (
                  <label
                    key={level}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                      selected
                        ? "border-accent-theme bg-accent-theme text-white"
                        : "border-theme-tertiary bg-theme-primary text-theme-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleLevel(level)}
                      className="sr-only"
                    />
                    {level}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div>
            <label htmlFor="edit-group-status" className="mb-1.5 block text-sm font-semibold text-theme-primary">
              상태
            </label>
            <Select
              id="edit-group-status"
              value={groupForm.status}
              onChangeAction={(status) =>
                setGroupForm((current) => ({
                  ...current,
                  status,
                }))
              }
              options={STATUS_OPTIONS}
              aria-label="모임 상태"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-theme-primary">기본 일정</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-group-weekday" className="mb-1 block text-sm text-theme-secondary">
                  요일
                </label>
                <Select
                  id="edit-group-weekday"
                  value={groupForm.defaultWeekday}
                  onChangeAction={(defaultWeekday) =>
                    setGroupForm((current) => ({
                      ...current,
                      defaultWeekday,
                    }))
                  }
                  options={WEEKDAY_OPTIONS}
                  emptyValue=""
                  aria-label="기본 모임 요일"
                />
              </div>
              <div>
                <label htmlFor="edit-group-time" className="mb-1 block text-sm text-theme-secondary">
                  시간
                </label>
                <FormNativePickerInput
                  id="edit-group-time"
                  picker="time"
                  value={groupForm.defaultTime}
                  onChange={(event) =>
                    setGroupForm((current) => ({ ...current, defaultTime: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-3">
              <label htmlFor="edit-group-location" className="mb-1 block text-sm text-theme-secondary">
                장소
              </label>
              <input
                id="edit-group-location"
                value={groupForm.defaultLocation}
                onChange={(event) =>
                  setGroupForm((current) => ({
                    ...current,
                    defaultLocation: event.target.value,
                  }))
                }
                maxLength={100}
                className="form-control"
              />
            </div>
          </fieldset>
          {settingsError && (
            <p className="text-sm text-red-600" role="alert">{settingsError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {updateMutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </FormModalFrame>

      <FormModalFrame
        isOpen={memberOpen}
        onClose={() => setMemberOpen(false)}
        title="오프라인 멤버 추가"
        interactionLocked={addMemberMutation.isPending}
      >
        <form onSubmit={submitOfflineMember} className="space-y-4">
          <div>
            <label htmlFor="offline-member-name" className="mb-1.5 block text-sm font-semibold text-theme-primary">
              표시명
            </label>
            <input
              id="offline-member-name"
              value={offlineName}
              onChange={(event) => setOfflineName(event.target.value)}
              required
              maxLength={60}
              autoFocus
              className="form-control"
              placeholder="예: 김독서"
            />
            <p className="mt-2 text-xs text-theme-secondary">
              계정 없이 출석과 모임 기록에 사용할 멤버를 추가합니다.
            </p>
          </div>
          <div>
            <label
              htmlFor="offline-member-kind"
              className="mb-1.5 block text-sm font-semibold text-theme-primary"
            >
              참여 유형
            </label>
            <Select
              id="offline-member-kind"
              value={offlineMemberRole}
              onChangeAction={setOfflineMemberRole}
              options={MEMBER_ROLE_OPTIONS}
              aria-label="오프라인 멤버 참여 유형"
            />
          </div>
          {memberError && <p className="text-sm text-red-600" role="alert">{memberError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMemberOpen(false)}
              className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {addMemberMutation.isPending ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </FormModalFrame>

      <FormModalFrame
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="모임 영구 삭제"
        interactionLocked={deleteMutation.isPending}
      >
        <div className="space-y-4">
          <p className="text-sm text-theme-secondary">
            이 작업은 되돌릴 수 없습니다. 계속하려면 아래에{" "}
            <strong className="text-theme-primary">{group.name}</strong>을(를) 입력하세요.
          </p>
          <div>
            <label htmlFor="delete-group-confirmation" className="sr-only">
              삭제 확인 모임 이름
            </label>
            <input
              id="delete-group-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoComplete="off"
              className="form-control"
            />
          </div>
          {deleteMutation.isError && (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage(deleteMutation.error, "모임을 삭제하지 못했습니다.")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={
                deleteConfirmation !== group.name || deleteMutation.isPending
              }
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleteMutation.isPending ? "삭제 중..." : "영구 삭제"}
            </button>
          </div>
        </div>
      </FormModalFrame>

      <ConfirmModal
        isOpen={Boolean(confirmIntent)}
        onClose={() => {
          if (busyMemberId || removeMemberMutation.isPending) return
          setConfirmIntent(null)
        }}
        onConfirm={() => {
          if (!confirmIntent) return
          if (confirmIntent.type === "transfer") {
            void executeTransferOwnership(confirmIntent.member)
            return
          }
          removeMemberMutation.mutate(confirmIntent.member.id, {
            onSettled: () => setConfirmIntent(null),
          })
        }}
        title={
          confirmIntent?.type === "transfer" ? "모임장 넘기기" : "멤버 제거"
        }
        message={
          confirmIntent?.type === "transfer"
            ? `${memberLabel(confirmIntent.member)}님에게 모임장 역할을 넘길까요?\n넘기면 지금부터 그분이 모임장을 맡게 됩니다.`
            : confirmIntent
              ? `${memberLabel(confirmIntent.member)} 멤버를 모임에서 제거할까요?`
              : ""
        }
        confirmText={
          busyMemberId || removeMemberMutation.isPending
            ? "처리 중…"
            : confirmIntent?.type === "transfer"
              ? "넘기기"
              : "제거"
        }
        cancelText="취소"
        icon={confirmIntent?.type === "transfer" ? UserPlus : UserMinus}
        iconColor={
          confirmIntent?.type === "transfer"
            ? "text-accent-theme"
            : "text-red-500"
        }
        iconBgColor={
          confirmIntent?.type === "transfer"
            ? "bg-accent-theme/15"
            : "bg-red-100 dark:bg-red-900/20"
        }
        confirmButtonColor={
          confirmIntent?.type === "transfer" ? "bg-accent-theme" : "bg-red-500"
        }
        confirmButtonHoverColor={
          confirmIntent?.type === "transfer"
            ? "hover:bg-accent-theme-secondary"
            : "hover:bg-red-600"
        }
        showSubtitle
      />
    </div>
  )
}
