import type {
  GroupMeetingPhase,
  GroupMeetingStatus,
} from "@/types/readingGroup"

const DEFAULT_TIME_ZONE = "Asia/Seoul"

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function partsInTimeZone(value: string | Date, timeZone: string): DateParts {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    throw new Error("올바르지 않은 날짜입니다.")
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const numberPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return {
    year: numberPart("year"),
    month: numberPart("month"),
    day: numberPart("day"),
    hour: numberPart("hour"),
    minute: numberPart("minute"),
  }
}

export function groupDateKey(
  value: string | Date,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const { year, month, day } = partsInTimeZone(value, timeZone)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function addCalendarDays(dateKey: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) throw new Error("올바르지 않은 날짜 형식입니다.")
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** 날짜의 일자를 가능한 한 유지하되 대상 월의 말일을 넘으면 말일로 맞춥니다. */
export function addCalendarMonths(dateKey: string, months: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) throw new Error("올바르지 않은 날짜 형식입니다.")
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const targetMonthStart = new Date(Date.UTC(year, monthIndex + months, 1))
  const targetYear = targetMonthStart.getUTCFullYear()
  const targetMonthIndex = targetMonthStart.getUTCMonth()
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonthIndex + 1, 0),
  ).getUTCDate()
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(
    Math.min(day, lastDay),
  ).padStart(2, "0")}`
}

/** 지정 시간대의 날짜 00:00을 UTC ISO 시각으로 변환합니다. */
export function zonedMidnightIso(
  dateKey: string,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) throw new Error("올바르지 않은 날짜 형식입니다.")
  const wallTimeUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  )
  let result = wallTimeUtc
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = partsInTimeZone(new Date(result), timeZone)
    const representedLocal = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
    )
    result -= representedLocal - wallTimeUtc
  }
  return new Date(result).toISOString()
}

export function zonedDateTimeIso(
  localValue: string,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue)
  if (!match) throw new Error("올바르지 않은 날짜·시간 형식입니다.")
  const targetWallTime = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  )
  let result = targetWallTime
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = partsInTimeZone(new Date(result), timeZone)
    const representedLocal = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
    )
    result -= representedLocal - targetWallTime
  }
  return new Date(result).toISOString()
}

export function timeZoneDateTimeInput(
  value: string | Date,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`
}

export function calculateMeetingReadingPeriod({
  groupCreatedAt,
  previousMeetingScheduledAt,
  meetingScheduledAt,
  timeZone = DEFAULT_TIME_ZONE,
}: {
  groupCreatedAt: string | Date
  previousMeetingScheduledAt?: string
  meetingScheduledAt: string
  timeZone?: string
}): { readingStartAt: string; readingEndAt: string } {
  const previousBoundary = previousMeetingScheduledAt ?? groupCreatedAt
  const previousDate = groupDateKey(previousBoundary, timeZone)
  const meetingDate = groupDateKey(meetingScheduledAt, timeZone)
  const startDate = addCalendarDays(previousDate, 1)
  const readingStartAt = zonedMidnightIso(startDate, timeZone)
  const readingEndAt = zonedMidnightIso(meetingDate, timeZone)
  if (readingStartAt >= readingEndAt) {
    throw new Error("회차 날짜는 읽기 시작일보다 뒤여야 합니다.")
  }
  return { readingStartAt, readingEndAt }
}

export function inclusiveReadingDateRange(
  readingStartAt: string,
  readingEndAt: string,
  timeZone = DEFAULT_TIME_ZONE,
): { startDate: string; endDate: string } {
  const endParts = partsInTimeZone(readingEndAt, timeZone)
  const endDate = groupDateKey(readingEndAt, timeZone)
  return {
    startDate: groupDateKey(readingStartAt, timeZone),
    endDate:
      endParts.hour === 0 && endParts.minute === 0
        ? addCalendarDays(endDate, -1)
        : endDate,
  }
}

export const GROUP_MEETING_PHASE_LABELS: Record<GroupMeetingPhase, string> = {
  scheduled: "예정",
  in_progress: "진행 중",
  awaiting_completion: "완료 대기",
  completed: "완료",
  cancelled: "취소",
}

/**
 * 저장 상태는 terminal 상태만 우선하고, 나머지는 독서 과제의 [start, end)
 * 경계에서 계산합니다. 과제가 없는 기존 회차는 예정 시각을 경계로 삼습니다.
 */
export function effectiveGroupMeetingPhase({
  status,
  scheduledAt,
  readingStartAt,
  readingEndAt,
  now,
}: {
  status: GroupMeetingStatus
  scheduledAt?: string
  readingStartAt?: string
  readingEndAt?: string
  now: string | Date
}): GroupMeetingPhase {
  if (status === "completed") return "completed"
  if (status === "cancelled") return "cancelled"

  const nowMs = (typeof now === "string" ? new Date(now) : now).getTime()
  const scheduledMs = scheduledAt ? new Date(scheduledAt).getTime() : Number.NaN
  const startMs = readingStartAt
    ? new Date(readingStartAt).getTime()
    : Number.NaN
  const endMs = readingEndAt ? new Date(readingEndAt).getTime() : Number.NaN

  if (
    Number.isFinite(nowMs) &&
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    startMs < endMs
  ) {
    if (nowMs < startMs) return "scheduled"
    if (nowMs < endMs) return "in_progress"
    return "awaiting_completion"
  }

  // Legacy 회차는 명시적으로 저장된 진행 상태만 안전하게 보존합니다.
  if (status === "in_progress") return "in_progress"
  if (Number.isFinite(nowMs) && Number.isFinite(scheduledMs)) {
    return nowMs < scheduledMs ? "scheduled" : "awaiting_completion"
  }
  return "scheduled"
}
