"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, MapPin, Pencil, Users } from "lucide-react"
import FormModalFrame from "@/components/FormModalFrame"
import { FormNativePickerInput } from "@/components/FormNativePickerInput"
import { queryKeys } from "@/lib/queryKeys"
import { ReadingGroupService } from "@/services/readingGroupService"
import type {
  GroupBook,
  GroupMeeting,
  GroupMember,
  MeetingBookAssignment,
  MeetingRecord,
} from "@/types/readingGroup"
import {
  effectiveGroupMeetingPhase,
  GROUP_MEETING_PHASE_LABELS,
} from "@/utils/readingGroupDates"

type Props = {
  groupId: string
  meetings: GroupMeeting[]
  assignments: MeetingBookAssignment[]
  books: GroupBook[]
  members: GroupMember[]
  initialRecords: MeetingRecord[]
  isOwner: boolean
  userUid: string
  timeZone: string
  onChangedAction: () => void | Promise<unknown>
}

type Draft = {
  attendeeIds: string[]
  summary: string
  discussionNotes: string
  decisions: string
  nextActions: string
  completedAt: string
}

function formatDate(value: string | undefined, timeZone: string) {
  if (!value) return "미정"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date)
}

function toLocalDateTime(value?: string) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function GroupMeetingRecordsPanel({
  groupId,
  meetings,
  assignments,
  books,
  members,
  initialRecords,
  isOwner,
  userUid,
  timeZone,
  onChangedAction,
}: Props) {
  const queryClient = useQueryClient()
  const [editingMeeting, setEditingMeeting] = useState<GroupMeeting | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [phaseNow, setPhaseNow] = useState(() => new Date())
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setPhaseNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const recordsQuery = useQuery({
    queryKey: queryKeys.readingGroups.meetingRecords(groupId),
    queryFn: () => ReadingGroupService.getGroupMeetingRecords(groupId),
    initialData: initialRecords,
  })
  const recordsByMeeting = useMemo(
    () => new Map((recordsQuery.data ?? []).map((record) => [record.meeting_id, record])),
    [recordsQuery.data],
  )
  const assignmentsByMeeting = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.meeting_id, assignment])),
    [assignments],
  )
  const booksById = useMemo(() => new Map(books.map((book) => [book.id, book])), [books])
  const membersById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  )
  const timeline = useMemo(
    () =>
      [...meetings].sort(
        (left, right) =>
          left.sequence - right.sequence ||
          new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
      ),
    [meetings],
  )
  const attendanceMembers = members.filter((member) => member.status === "active")

  const openEditor = (meeting: GroupMeeting) => {
    const record = recordsByMeeting.get(meeting.id)
    setEditingMeeting(meeting)
    setDraft({
      attendeeIds: record?.attendee_member_ids ?? [],
      summary: record?.summary ?? "",
      discussionNotes: record?.discussion_notes ?? "",
      decisions: record?.decisions?.join("\n") ?? "",
      nextActions: record?.next_actions?.join("\n") ?? "",
      completedAt: toLocalDateTime(record?.completed_at ?? meeting.ended_at),
    })
    setError("")
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingMeeting || !draft) return
    const summary = draft.summary.trim()
    if (!summary || !draft.completedAt) {
      setError("요약과 실제 완료 일시는 필수입니다.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await ReadingGroupService.upsertMeetingRecord(groupId, editingMeeting.id, {
        recorded_by_user_id: userUid,
        attendee_member_ids: draft.attendeeIds,
        summary,
        discussion_notes: draft.discussionNotes.trim() || undefined,
        decisions: lines(draft.decisions),
        next_actions: lines(draft.nextActions),
        completed_at: new Date(draft.completedAt).toISOString(),
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.readingGroups.meetingRecords(groupId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.readingGroups.meetings(groupId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.readingGroups.detail(groupId),
        }),
        onChangedAction(),
      ])
      setEditingMeeting(null)
      setDraft(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "회차 기록을 저장하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  if (!timeline.length) {
    return (
      <p className="rounded-lg border border-dashed border-theme-tertiary p-8 text-center text-sm text-theme-secondary">
        기록할 회차가 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-theme-primary">회차 기록</h2>
        <p className="mt-1 text-xs text-theme-secondary">
          예정 및 완료 회차의 책, 출석과 회의 결과를 확인합니다.
        </p>
      </div>
      <ol className="space-y-4">
        {timeline.map((meeting) => {
          const record = recordsByMeeting.get(meeting.id)
          const assignment = assignmentsByMeeting.get(meeting.id)
          const book = assignment ? booksById.get(assignment.group_book_id) : undefined
          const phase = effectiveGroupMeetingPhase({
            status: meeting.status,
            scheduledAt: meeting.scheduled_at,
            readingStartAt: assignment?.reading_start_at,
            readingEndAt: assignment?.reading_end_at,
            now: phaseNow,
          })
          return (
            <li key={meeting.id} className="rounded-xl bg-theme-tertiary p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-theme-primary">
                      {meeting.sequence}회 · {meeting.title}
                    </h3>
                    <span className="rounded-full bg-theme-secondary px-2 py-0.5 text-[11px] text-theme-secondary">
                      {GROUP_MEETING_PHASE_LABELS[phase]}
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-theme-secondary">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    예정 {formatDate(meeting.scheduled_at, timeZone)}
                    {record?.completed_at && ` · 실제 ${formatDate(record.completed_at, timeZone)}`}
                  </p>
                  {meeting.location && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-theme-secondary">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {meeting.location}
                    </p>
                  )}
                  {assignment && (
                    <p className="mt-2 text-sm text-theme-primary">
                      『{assignment.book_title_snapshot ?? book?.title ?? "책 정보 없음"}』
                    </p>
                  )}
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => openEditor(meeting)}
                    className="shrink-0 rounded-lg bg-theme-secondary p-2 text-theme-primary"
                    aria-label={`${meeting.sequence}회 기록 ${record ? "수정" : "작성"}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              {record ? (
                <div className="mt-4 space-y-3 border-t border-theme-secondary pt-4">
                  <div>
                    <h4 className="text-xs font-semibold text-theme-secondary">요약</h4>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-theme-primary">
                      {record.summary}
                    </p>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-1 text-xs font-semibold text-theme-secondary">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      출석
                    </h4>
                    <p className="mt-1 text-sm text-theme-primary">
                      {record.attendee_member_ids
                        .map((id) => membersById.get(id)?.display_name)
                        .filter(Boolean)
                        .join(", ") || "출석자 없음"}
                    </p>
                  </div>
                  {record.discussion_notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-theme-secondary">토론 메모</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-theme-primary">
                        {record.discussion_notes}
                      </p>
                    </div>
                  )}
                  {Boolean(record.decisions?.length) && (
                    <div>
                      <h4 className="text-xs font-semibold text-theme-secondary">결정 사항</h4>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-theme-primary">
                        {record.decisions?.map((item, index) => <li key={index}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {Boolean(record.next_actions?.length) && (
                    <div>
                      <h4 className="text-xs font-semibold text-theme-secondary">다음 할 일</h4>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-theme-primary">
                        {record.next_actions?.map((item, index) => <li key={index}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 border-t border-theme-secondary pt-4 text-sm text-theme-secondary">
                  아직 작성된 회차 기록이 없습니다.
                </p>
              )}
            </li>
          )
        })}
      </ol>

      <FormModalFrame
        isOpen={Boolean(editingMeeting && draft)}
        onClose={() => setEditingMeeting(null)}
        title={`${editingMeeting?.sequence ?? ""}회 기록`}
        size="wide"
        interactionLocked={busy}
      >
        {draft && (
          <form onSubmit={save} className="space-y-4">
            <fieldset className="rounded-lg border border-theme-tertiary p-3">
              <legend className="px-1 text-sm font-semibold text-theme-primary">출석 멤버</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {attendanceMembers.map((member) => (
                  <label key={member.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-theme-primary">
                    <input
                      type="checkbox"
                      checked={draft.attendeeIds.includes(member.id)}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          attendeeIds: event.target.checked
                            ? [...draft.attendeeIds, member.id]
                            : draft.attendeeIds.filter((id) => id !== member.id),
                        })
                      }
                      className="peer sr-only"
                    />
                    <span
                      className="h-4 w-4 shrink-0 rounded border border-theme-secondary bg-theme-primary ring-offset-2 peer-checked:border-accent-theme peer-checked:bg-accent-theme peer-focus-visible:ring-2 peer-focus-visible:ring-accent-theme"
                      aria-hidden
                    />
                    {member.display_name}
                    {!member.user_id && (
                      <span className="text-xs text-theme-secondary">(오프라인)</span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium text-theme-primary">
              실제 완료 일시
              <FormNativePickerInput
                picker="datetime-local"
                required
                value={draft.completedAt}
                onChange={(event) => setDraft({ ...draft, completedAt: event.target.value })}
                wrapperClassName="mt-1"
              />
            </label>
            <label className="block text-sm font-medium text-theme-primary">
              요약
              <textarea
                required
                rows={4}
                value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                className="form-control form-control-textarea mt-1"
              />
            </label>
            <label className="block text-sm font-medium text-theme-primary">
              토론 메모
              <textarea
                rows={5}
                value={draft.discussionNotes}
                onChange={(event) => setDraft({ ...draft, discussionNotes: event.target.value })}
                className="form-control form-control-textarea mt-1"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-theme-primary">
                결정 사항 (한 줄에 하나)
                <textarea
                  rows={5}
                  value={draft.decisions}
                  onChange={(event) => setDraft({ ...draft, decisions: event.target.value })}
                  className="form-control form-control-textarea mt-1"
                />
              </label>
              <label className="block text-sm font-medium text-theme-primary">
                다음 할 일 (한 줄에 하나)
                <textarea
                  rows={5}
                  value={draft.nextActions}
                  onChange={(event) => setDraft({ ...draft, nextActions: event.target.value })}
                  className="form-control form-control-textarea mt-1"
                />
              </label>
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMeeting(null)}
                className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "저장 중…" : "저장하고 완료 처리"}
              </button>
            </div>
          </form>
        )}
      </FormModalFrame>
    </div>
  )
}
