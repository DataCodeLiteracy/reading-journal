"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import {
  FormDatePicker,
  FormTimePicker,
} from "@/components/FormDateTimePicker"
import FormModalFrame from "@/components/FormModalFrame"
import Select, { type SelectOption } from "@/components/Select"
import { ReadingGroupService } from "@/services/readingGroupService"
import type {
  GroupBook,
  GroupMeeting,
  MeetingBookAssignment,
  ReadingGroup,
} from "@/types/readingGroup"
import {
  addCalendarDays,
  addCalendarMonths,
  effectiveGroupMeetingPhase,
  GROUP_MEETING_PHASE_LABELS,
  groupDateKey,
  inclusiveReadingDateRange,
  timeZoneDateTimeInput,
  zonedDateTimeIso,
  zonedMidnightIso,
} from "@/utils/readingGroupDates"

type Props = {
  group: ReadingGroup
  meetings: GroupMeeting[]
  books: GroupBook[]
  assignments: MeetingBookAssignment[]
  isOwner: boolean
  onChangedAction: () => void | Promise<unknown>
}

type Draft = {
  sequence: string
  title: string
  readingStartDate: string
  meetingDate: string
  meetingTime: string
  location: string
  agenda: string
  groupBookId: string
}

type DurationPreset = "week1" | "week2" | "week3" | "month1"

const DURATION_PRESETS: {
  id: DurationPreset
  label: string
  days?: number
  months?: number
}[] = [
  { id: "week1", label: "1주", days: 7 },
  { id: "week2", label: "2주", days: 14 },
  { id: "week3", label: "3주", days: 21 },
  { id: "month1", label: "한 달", months: 1 },
]
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

function formatDateTime(value: string, timeZone: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function readingStartDate(
  group: ReadingGroup,
  meetings: GroupMeeting[],
  sequence: number,
  editingId?: string,
) {
  const previous = meetings
    .filter(
      (meeting) =>
        meeting.id !== editingId &&
        meeting.sequence < sequence &&
        meeting.status === "completed",
    )
    .sort((left, right) => right.sequence - left.sequence)[0]
  return addCalendarDays(
    groupDateKey(previous?.scheduled_at ?? group.created_at ?? new Date(), group.time_zone),
    1,
  )
}

function presetMeetingDate(startDate: string, preset: DurationPreset) {
  const option = DURATION_PRESETS.find((item) => item.id === preset)
  if (!option) return startDate
  return option.months
    ? addCalendarMonths(startDate, option.months)
    : addCalendarDays(startDate, option.days ?? 0)
}

function matchingPreset(
  startDate: string,
  meetingDate: string,
): DurationPreset | null {
  return (
    DURATION_PRESETS.find(
      (preset) => presetMeetingDate(startDate, preset.id) === meetingDate,
    )?.id ?? null
  )
}

function makeCreateDraft(group: ReadingGroup, meetings: GroupMeeting[], books: GroupBook[]) {
  const sequence = Math.max(0, ...meetings.map((meeting) => meeting.sequence)) + 1
  const startDate = readingStartDate(group, meetings, sequence)
  const scheduledDate = presetMeetingDate(startDate, "week1")
  return {
    sequence: String(sequence),
    title: `${sequence}회차 모임`,
    readingStartDate: startDate,
    meetingDate: scheduledDate,
    meetingTime: group.default_time || "19:00",
    location: group.default_location ?? "",
    agenda: "",
    groupBookId: books.find((book) => book.canonical_book_id)?.id ?? "",
  }
}

function makeEditDraft(
  meeting: GroupMeeting,
  assignment: MeetingBookAssignment | undefined,
  timeZone: string,
): Draft {
  const scheduledAt = timeZoneDateTimeInput(meeting.scheduled_at, timeZone)
  return {
    sequence: String(meeting.sequence),
    title: meeting.title,
    readingStartDate: assignment?.reading_start_at
      ? groupDateKey(assignment.reading_start_at, timeZone)
      : "",
    meetingDate: scheduledAt.slice(0, 10),
    meetingTime: scheduledAt.slice(11, 16),
    location: meeting.location ?? "",
    agenda: meeting.agenda ?? "",
    groupBookId: assignment?.group_book_id ?? "",
  }
}

export default function GroupSchedulePanel({
  group,
  meetings,
  books,
  assignments,
  isOwner,
  onChangedAction,
}: Props) {
  const initialMonth = new Date()
  const [month, setMonth] = useState({ year: initialMonth.getFullYear(), month: initialMonth.getMonth() })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GroupMeeting | null>(null)
  const [draft, setDraft] = useState<Draft>(() => makeCreateDraft(group, meetings, books))
  const [selectedPreset, setSelectedPreset] = useState<DurationPreset | null>("week1")
  const [phaseNow, setPhaseNow] = useState(() => new Date())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const timer = window.setInterval(() => setPhaseNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const availableBooks = books.filter(
    (book) =>
      Boolean(book.canonical_book_id) &&
      ["planned", "on_hold"].includes(book.status),
  )
  const canonicalBooks = books.filter(
    (book) =>
      Boolean(book.canonical_book_id) &&
      (editing?.id === assignments.find((item) => item.group_book_id === book.id)?.meeting_id ||
        ["planned", "on_hold"].includes(book.status)),
  )
  const bookOptions: SelectOption[] = [
    { value: "", label: "선택해 주세요" },
    ...canonicalBooks.map((book) => ({
      value: book.id,
      label: book.title,
    })),
  ]
  const booksById = useMemo(() => new Map(books.map((book) => [book.id, book])), [books])
  const assignmentsByMeeting = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.meeting_id, assignment])),
    [assignments],
  )
  const meetingsByDate = useMemo(() => {
    const result = new Map<string, GroupMeeting[]>()
    meetings.forEach((meeting) => {
      const key = groupDateKey(meeting.scheduled_at, group.time_zone)
      result.set(key, [...(result.get(key) ?? []), meeting])
    })
    return result
  }, [group.time_zone, meetings])
  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(month.year, month.month, 1)).getUTCDay()
    const count = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate()
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ]
  }, [month])

  const openCreate = () => {
    setEditing(null)
    setDraft(makeCreateDraft(group, meetings, availableBooks))
    setSelectedPreset("week1")
    setError("")
    setModalOpen(true)
  }

  const openEdit = (meeting: GroupMeeting) => {
    const assignment = assignmentsByMeeting.get(meeting.id)
    const nextDraft = makeEditDraft(meeting, assignment, group.time_zone)
    const startDate = assignment?.reading_start_at
      ? groupDateKey(assignment.reading_start_at, group.time_zone)
      : readingStartDate(group, meetings, meeting.sequence, meeting.id)
    setEditing(meeting)
    setDraft(nextDraft)
    setSelectedPreset(matchingPreset(startDate, nextDraft.meetingDate))
    setError("")
    setModalOpen(true)
  }

  const applyPreset = (preset: DurationPreset) => {
    if (!draft.readingStartDate) return
    const meetingDate = presetMeetingDate(draft.readingStartDate, preset)
    setDraft((current) => ({
      ...current,
      meetingDate,
    }))
    setSelectedPreset(preset)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const sequence = Number(draft.sequence)
    const book = booksById.get(draft.groupBookId)
    if (!Number.isInteger(sequence) || sequence < 1) return setError("회차는 1 이상의 정수여야 합니다.")
    if (!book?.canonical_book_id) return setError("공유 판본이 연결된 책을 선택해 주세요.")
    if (!draft.title.trim()) return setError("회차 제목을 입력해 주세요.")
    if (!draft.readingStartDate) return setError("독서 시작일을 입력해 주세요.")
    if (!draft.meetingDate) return setError("종료 날짜를 입력해 주세요.")
    if (!draft.meetingTime) return setError("모임 시간을 입력해 주세요.")
    const scheduledAt = zonedDateTimeIso(
      `${draft.meetingDate}T${draft.meetingTime}`,
      group.time_zone,
    )
    const readingStartAt = zonedMidnightIso(
      draft.readingStartDate,
      group.time_zone,
    )
    const readingEndAt = scheduledAt
    if (readingStartAt >= readingEndAt) {
      return setError("독서 시작일은 모임 예정일보다 빨라야 합니다.")
    }
    const meetingInput = {
      sequence,
      title: draft.title.trim(),
      scheduled_at: scheduledAt,
      ended_at: new Date(new Date(scheduledAt).getTime() + 2 * 60 * 60_000).toISOString(),
      location: draft.location.trim() || undefined,
      agenda: draft.agenda.trim() || undefined,
    }
    const assignmentInput = {
      group_book_id: book.id,
      canonical_book_id: book.canonical_book_id,
      reading_start_at: readingStartAt,
      reading_end_at: readingEndAt,
      reading_range: "완독",
    }

    setBusy(true)
    setError("")
    try {
      if (editing) {
        await ReadingGroupService.updateMeeting(editing.id, meetingInput)
        const assignment = assignmentsByMeeting.get(editing.id)
        if (assignment) {
          await ReadingGroupService.updateMeetingBookAssignment(assignment.id, assignmentInput)
        } else {
          await ReadingGroupService.createMeetingBookAssignment(group.id, editing.id, assignmentInput)
        }
      } else {
        await ReadingGroupService.createMeetingWithBookAssignment(
          group.id,
          { ...meetingInput, status: "scheduled" },
          assignmentInput,
        )
      }
      await onChangedAction()
      setModalOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "회차를 저장하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  const removeMeeting = async (meeting: GroupMeeting) => {
    if (!window.confirm(`${meeting.sequence}회차와 연결된 책 과제를 삭제할까요?`)) return
    setBusy(true)
    setError("")
    try {
      await ReadingGroupService.deleteMeeting(meeting.id)
      await onChangedAction()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "회차를 삭제하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  const completeMeeting = async (meeting: GroupMeeting) => {
    if (
      !window.confirm(
        `${meeting.sequence}회차를 완료할까요?\n예정 날짜 전이라도 실제 오프라인 모임이 끝났다면 완료할 수 있으며, 배정 책도 완료 상태로 확정됩니다.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError("")
    try {
      await ReadingGroupService.completeMeeting(meeting.id)
      await onChangedAction()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "회차를 완료하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-theme-primary">모임 일정</h2>
        {isOwner && (
          <button
            type="button"
            onClick={openCreate}
            disabled={
              !availableBooks.length ||
              (meetings.length > 0 && meetings.some((meeting) => meeting.status !== "completed"))
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-theme px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            title={
              !availableBooks.length
                ? "예정 또는 선정 보류 책을 먼저 추가해 주세요."
                : meetings.some((meeting) => meeting.status !== "completed")
                  ? "기존 회차를 모두 완료한 뒤 만들 수 있습니다."
                  : undefined
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            회차 만들기
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{error}</p>}

      <section
        aria-label="월간 모임 달력"
        className="overflow-hidden rounded-2xl border border-theme-tertiary/70 bg-theme-secondary shadow-sm"
      >
        <div className="flex items-center justify-between px-2 py-2 sm:px-3">
          <button
            type="button"
            onClick={() =>
              setMonth((current) =>
                current.month === 0
                  ? { year: current.year - 1, month: 11 }
                  : { ...current, month: current.month - 1 },
              )
            }
            className="rounded-full p-1.5 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <h3 className="text-sm font-semibold tracking-tight text-theme-primary sm:text-base">
            {month.year}년 {month.month + 1}월
          </h3>
          <button
            type="button"
            onClick={() =>
              setMonth((current) =>
                current.month === 11
                  ? { year: current.year + 1, month: 0 }
                  : { ...current, month: current.month + 1 },
              )
            }
            className="rounded-full p-1.5 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary"
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-7 px-1 pb-1">
          {WEEKDAYS.map((weekday, weekdayIndex) => (
            <div
              key={weekday}
              className={`py-1 text-center text-[10px] font-semibold sm:text-[11px] ${
                weekdayIndex === 0
                  ? "text-red-500/80"
                  : weekdayIndex === 6
                    ? "text-blue-500/80"
                    : "text-theme-tertiary"
              }`}
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px border-t border-theme-tertiary/50 bg-theme-tertiary/60 px-px pb-px">
          {calendarDays.map((day, index) => {
            const key = day
              ? `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              : ""
            const dayMeetings = day ? (meetingsByDate.get(key) ?? []) : []
            const todayKey = groupDateKey(new Date(), group.time_zone)
            const isToday = Boolean(day && key === todayKey)
            const weekday = day
              ? new Date(Date.UTC(month.year, month.month, day)).getUTCDay()
              : -1

            return (
              <div
                key={`${day ?? "empty"}-${index}`}
                className={`flex min-h-[2.75rem] flex-col items-center justify-start bg-theme-secondary py-0.5 sm:min-h-[3rem] ${
                  day ? "" : "bg-theme-tertiary/25"
                } ${dayMeetings.length > 0 ? "pb-1" : ""}`}
              >
                {day && (
                  <>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium sm:h-6 sm:w-6 sm:text-xs ${
                        isToday
                          ? "bg-accent-theme font-semibold text-white shadow-sm"
                          : weekday === 0
                            ? "text-red-500"
                            : weekday === 6
                              ? "text-blue-500"
                              : "text-theme-primary"
                      }`}
                    >
                      {day}
                    </span>
                    {dayMeetings.length > 0 && (
                      <div className="mt-0.5 flex w-full flex-col items-stretch gap-0.5 px-0.5">
                        {dayMeetings.map((meeting) => (
                          <button
                            key={meeting.id}
                            type="button"
                            onClick={() =>
                              document
                                .getElementById(`meeting-${meeting.id}`)
                                ?.scrollIntoView({ behavior: "smooth", block: "center" })
                            }
                            className="w-full rounded-md bg-accent-theme px-1 py-0.5 text-center text-[10px] font-bold leading-tight text-white shadow-sm transition-colors hover:bg-accent-theme-secondary sm:text-[11px]"
                            title={`${meeting.sequence}회 · ${meeting.title}`}
                          >
                            {meeting.sequence}회
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="meeting-list-heading">
        <h3 id="meeting-list-heading" className="mb-3 font-semibold text-theme-primary">회차 목록</h3>
        {!meetings.length ? (
          <p className="rounded-lg border border-dashed border-theme-tertiary p-8 text-center text-sm text-theme-secondary">등록된 모임 일정이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {meetings.map((meeting) => {
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
                <li id={`meeting-${meeting.id}`} key={meeting.id} className="relative scroll-mt-4 rounded-xl bg-theme-tertiary p-4">
                  <div className={isOwner && meeting.status !== "completed" ? "pr-20" : ""}>
                    <h4 className="min-h-8 font-semibold leading-8 text-theme-primary">{meeting.sequence}회 · {meeting.title}</h4>
                  </div>
                  <div className="mt-1 grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <p className="min-w-0 text-sm leading-5 text-theme-secondary">
                      {formatDateTime(meeting.scheduled_at, group.time_zone)}
                    </p>
                    <span className="inline-flex h-7 items-center rounded-full bg-theme-secondary px-2.5 text-xs text-theme-secondary">
                      {GROUP_MEETING_PHASE_LABELS[phase]}
                    </span>
                  </div>
                  {(meeting.location ||
                    (isOwner &&
                      !["completed", "cancelled"].includes(meeting.status))) && (
                    <div className="mt-2 flex min-h-8 items-center justify-between gap-3">
                      {meeting.location ? (
                        <p className="flex min-w-0 items-center gap-1 text-sm leading-5 text-theme-secondary">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{meeting.location}</span>
                        </p>
                      ) : (
                        <span />
                      )}
                      {isOwner &&
                        !["completed", "cancelled"].includes(meeting.status) && (
                          <button
                            type="button"
                            onClick={() => void completeMeeting(meeting)}
                            disabled={busy}
                            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-accent-theme px-2.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                            회차 완료
                          </button>
                        )}
                    </div>
                  )}
                  {isOwner && meeting.status !== "completed" && (
                    <div className="absolute right-3 top-3 flex gap-1">
                      <button type="button" onClick={() => openEdit(meeting)} className="rounded-md bg-theme-secondary p-2 text-theme-primary" aria-label={`${meeting.sequence}회차 수정`}><Pencil className="h-4 w-4" aria-hidden /></button>
                      <button type="button" onClick={() => void removeMeeting(meeting)} disabled={busy} className="rounded-md bg-theme-secondary p-2 text-red-600 disabled:opacity-50" aria-label={`${meeting.sequence}회차 삭제`}><Trash2 className="h-4 w-4" aria-hidden /></button>
                    </div>
                  )}
                  {meeting.agenda && <p className="mt-3 whitespace-pre-wrap text-sm text-theme-primary">{meeting.agenda}</p>}
                  {assignment ? (
                    <div className="mt-3 rounded-lg bg-theme-secondary p-3 text-sm">
                      <p className="font-medium text-theme-primary">『{assignment.book_title_snapshot ?? book?.title ?? "책 정보 없음"}』</p>
                      <p className="mt-1 text-xs text-theme-secondary">
                        {(() => {
                          const range = inclusiveReadingDateRange(assignment.reading_start_at, assignment.reading_end_at, group.time_zone)
                          const stoppedDate = assignment.stopped_at
                            ? groupDateKey(assignment.stopped_at, group.time_zone)
                            : undefined
                          return stoppedDate
                            ? `중단 기간 ${range.startDate} ~ ${stoppedDate} · 원래 예정 ${range.startDate} ~ ${range.endDate}`
                            : `읽기 기간 ${range.startDate} ~ ${range.endDate}`
                        })()}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-theme-secondary">연결된 책 과제가 없습니다.</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <FormModalFrame
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "회차 수정" : "새 회차 만들기"}
        size="wide"
        interactionLocked={busy}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <label className="text-sm font-medium text-theme-primary">
              회차
              <input type="number" min={1} required value={draft.sequence} onChange={(event) => setDraft({ ...draft, sequence: event.target.value })} className="form-control mt-1" />
            </label>
            <label className="text-sm font-medium text-theme-primary">
              제목
              <input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="form-control mt-1" />
            </label>
          </div>
          <fieldset className="space-y-3 rounded-lg border border-theme-tertiary p-3">
            <legend className="px-1 text-sm font-semibold text-theme-primary">독서 기간과 모임 일정</legend>
            <div>
              <label
                htmlFor="group-meeting-reading-start-date"
                className="block text-sm font-medium text-theme-primary"
              >
                시작 날짜
              </label>
              <FormDatePicker
                id="group-meeting-reading-start-date"
                aria-label="독서 시작 날짜"
                required
                value={draft.readingStartDate}
                onChangeAction={(readingStartDate) => {
                  setDraft((current) => ({
                    ...current,
                    readingStartDate,
                  }))
                  setSelectedPreset(null)
                }}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="group-meeting-end-date"
                className="block text-sm font-medium text-theme-primary"
              >
                종료 날짜
              </label>
              <FormDatePicker
                id="group-meeting-end-date"
                aria-label="독서 종료 날짜"
                required
                value={draft.meetingDate}
                onChangeAction={(meetingDate) => {
                  setDraft((current) => ({
                    ...current,
                    meetingDate,
                  }))
                  setSelectedPreset(null)
                }}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="group-meeting-time"
                className="block text-sm font-medium text-theme-primary"
              >
                모임 시간
              </label>
              <FormTimePicker
                id="group-meeting-time"
                aria-label="모임 시간"
                required
                value={draft.meetingTime}
                onChangeAction={(meetingTime) =>
                  setDraft((current) => ({
                    ...current,
                    meetingTime,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-theme-secondary">빠른 기간 선택</p>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    disabled={!draft.readingStartDate}
                    aria-pressed={selectedPreset === preset.id}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      selectedPreset === preset.id
                        ? "bg-accent-theme text-white"
                        : "bg-theme-tertiary text-theme-primary"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-theme-secondary">
                선택한 종료 날짜의 모임 시간이 지나면 완료 대기 상태가 됩니다.
              </p>
            </div>
          </fieldset>
          <div>
            <label className="text-sm font-medium text-theme-primary">
              장소
              <input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className="form-control mt-1" />
            </label>
          </div>
          <label className="block text-sm font-medium text-theme-primary">
            안건
            <textarea rows={3} value={draft.agenda} onChange={(event) => setDraft({ ...draft, agenda: event.target.value })} className="form-control form-control-textarea mt-1" />
          </label>
          <fieldset className="space-y-3 rounded-lg border border-theme-tertiary p-3">
            <legend className="px-1 text-sm font-semibold text-theme-primary">회차 책과 읽기 기간</legend>
            <label className="block text-sm font-medium text-theme-primary">
              책
              <Select
                value={draft.groupBookId}
                onChangeAction={(groupBookId) =>
                  setDraft({ ...draft, groupBookId })
                }
                options={bookOptions}
                emptyValue=""
                disabled={Boolean(editing)}
                className="mt-1"
                aria-label="회차 책"
                truncate={false}
              />
            </label>
            <p className="text-xs text-theme-secondary">
              책 전체 완독을 목표로 하며, 선택한 독서 시작일부터 이번 모임 전날까지 읽습니다.
            </p>
          </fieldset>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary">취소</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "저장 중…" : "저장"}</button>
          </div>
        </form>
      </FormModalFrame>
    </div>
  )
}
