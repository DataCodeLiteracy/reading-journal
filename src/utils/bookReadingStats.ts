import type { ReadingSession } from "@/types/user"

function parseYmd(dateStr: string): { y: number; m: number; d: number } | null {
  const part = dateStr.trim().split("T")[0]
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return { y, m: mo, d }
}

/** YYYY-MM-DD → YYYY.MM.DD */
export function formatDotDate(ymd: string): string {
  const p = parseYmd(ymd)
  if (!p) return ymd
  const mm = String(p.m).padStart(2, "0")
  const dd = String(p.d).padStart(2, "0")
  return `${p.y}.${mm}.${dd}`
}

export function getDistinctSessionDates(sessions: ReadingSession[]): string[] {
  const set = new Set<string>()
  for (const s of sessions) {
    const d = s.date?.trim()
    if (d) set.add(d.split("T")[0])
  }
  return [...set].sort()
}

/** 실제 독서 세션이 있는 날짜 수(중복 일자 제외) */
export function computeReadingDaysCount(sessionDates: string[]): number {
  return new Set(sessionDates).size
}

/** 세션 날짜에서 추출한 연도 목록 (예: 2025년, 2026년) */
export function computeReadingYears(sessionDates: string[]): string[] {
  const years = new Set<number>()
  for (const d of sessionDates) {
    const p = parseYmd(d)
    if (p) years.add(p.y)
  }
  return [...years].sort((a, b) => a - b).map((y) => `${y}년`)
}

/** 세션 날짜에서 추출한 연·월 목록 (예: 2026년 4월, 2026년 5월) */
export function computeReadingYearMonths(sessionDates: string[]): string[] {
  const keys = new Set<string>()
  for (const d of sessionDates) {
    const p = parseYmd(d)
    if (!p) continue
    keys.add(`${p.y}-${String(p.m).padStart(2, "0")}`)
  }
  return [...keys].sort().map((k) => {
    const [y, mo] = k.split("-")
    return `${y}년 ${Number(mo)}월`
  })
}

/**
 * 읽은 기간: 첫 독서일 ~ 마지막 독서일.
 * 세션이 없으면 startDate ~ completedDate(또는 start만)로 대체.
 */
export function computeReadingPeriodSpan(
  sessionDates: string[],
  fallbackStart?: string,
  fallbackEnd?: string
): string {
  let dates = sessionDates
  if (dates.length === 0) {
    const start = fallbackStart?.trim().split("T")[0]
    const end = (fallbackEnd || fallbackStart)?.trim().split("T")[0]
    dates = [start, end].filter((d): d is string => Boolean(d))
  }
  if (dates.length === 0) return ""

  const sorted = [...dates].sort()
  const first = formatDotDate(sorted[0])
  const last = formatDotDate(sorted[sorted.length - 1])
  if (first === last) return first
  return `${first} ~ ${last}`
}
