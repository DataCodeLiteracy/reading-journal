import type { Book } from "@/types/book"
import type { ReadingSession } from "@/types/user"
import type {
  BookPeriodAnalysis,
  BookPeriodMetricKey,
  BookPeriodRange,
  BookPeriodType,
} from "@/types/bookPeriodStatistics"

export type BookPeriodStatisticsContext = {
  sessionsByBookId?: Map<string, ReadingSession[]>
}

export function buildSessionsByBookId(
  sessions: ReadingSession[],
): Map<string, ReadingSession[]> {
  const map = new Map<string, ReadingSession[]>()
  for (const session of sessions) {
    const list = map.get(session.bookId) ?? []
    list.push(session)
    map.set(session.bookId, list)
  }
  return map
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function isYmdInRange(
  ymd: string | undefined | null,
  start: string,
  end: string,
): boolean {
  if (!ymd?.trim()) return false
  const d = ymd.trim().split("T")[0]
  return d >= start && d <= end
}

export function getBookRegisteredDate(book: Book): string | null {
  if (!book.created_at) return null
  const raw = book.created_at
  const d =
    raw instanceof Date
      ? raw
      : typeof raw === "object" && raw !== null && "toDate" in raw
        ? (raw as { toDate: () => Date }).toDate()
        : new Date(String(raw))
  if (Number.isNaN(d.getTime())) return null
  return formatYmd(d)
}

/** 읽기 시작일 추정: startDate → 회독 시작일 → 첫 독서 세션 → 등록일 */
export function getEffectiveReadingStartDate(
  book: Book,
  sessions?: ReadingSession[],
): string | null {
  const explicit = book.startDate?.trim().split("T")[0]
  if (explicit) return explicit

  const rereadStart = book.currentRereadStartDate?.trim().split("T")[0]
  if (rereadStart) return rereadStart

  if (sessions?.length) {
    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date))
    return sorted[0]!.date
  }

  if (
    book.hasStartedReading ||
    book.status === "reading" ||
    book.status === "completed" ||
    book.status === "on-hold"
  ) {
    return getBookRegisteredDate(book)
  }

  return null
}

function startedReadingInPeriodWithoutCompletionByPeriodEnd(
  book: Book,
  range: BookPeriodRange,
  sessions?: ReadingSession[],
): boolean {
  if (book.status === "want-to-read" && !book.hasStartedReading) return false

  const readingStart = getEffectiveReadingStartDate(book, sessions)
  if (!readingStart || !isYmdInRange(readingStart, range.start, range.end)) {
    return false
  }

  const completed = book.completedDate?.trim().split("T")[0]
  if (completed && completed <= range.end) return false

  return (
    book.hasStartedReading ||
    book.status === "reading" ||
    book.status === "on-hold" ||
    Boolean(completed && completed > range.end)
  )
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

function endOfWeekSunday(weekStart: Date): Date {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  return end
}

function quarterOfMonth(month: number): number {
  return Math.floor(month / 3) + 1
}

function halfOfMonth(month: number): 1 | 2 {
  return month < 6 ? 1 : 2
}

export function getBookPeriodRange(
  type: BookPeriodType,
  anchor: Date = new Date(),
): BookPeriodRange {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()

  if (type === "week") {
    const start = startOfWeekMonday(anchor)
    const end = endOfWeekSunday(start)
    const startStr = formatYmd(start)
    const endStr = formatYmd(end)
    return {
      type,
      start: startStr,
      end: endStr,
      label: `${start.getFullYear()}.${pad2(start.getMonth() + 1)}.${pad2(start.getDate())} – ${pad2(end.getMonth() + 1)}.${pad2(end.getDate())}`,
      key: `w-${startStr}`,
    }
  }

  if (type === "month") {
    const start = new Date(y, m, 1)
    const end = new Date(y, m + 1, 0)
    const startStr = formatYmd(start)
    const endStr = formatYmd(end)
    return {
      type,
      start: startStr,
      end: endStr,
      label: `${y}년 ${m + 1}월`,
      key: `m-${y}-${pad2(m + 1)}`,
    }
  }

  if (type === "quarter") {
    const q = quarterOfMonth(m)
    const startMonth = (q - 1) * 3
    const start = new Date(y, startMonth, 1)
    const end = new Date(y, startMonth + 3, 0)
    return {
      type,
      start: formatYmd(start),
      end: formatYmd(end),
      label: `${y}년 ${q}분기`,
      key: `q-${y}-Q${q}`,
    }
  }

  if (type === "half") {
    const h = halfOfMonth(m)
    const startMonth = h === 1 ? 0 : 6
    const start = new Date(y, startMonth, 1)
    const end = new Date(y, startMonth + 6, 0)
    return {
      type,
      start: formatYmd(start),
      end: formatYmd(end),
      label: `${y}년 ${h === 1 ? "상반기 (1–6월)" : "하반기 (7–12월)"}`,
      key: `h-${y}-H${h}`,
    }
  }

  const start = new Date(y, 0, 1)
  const end = new Date(y, 11, 31)
  return {
    type: "year",
    start: formatYmd(start),
    end: formatYmd(end),
    label: `${y}년`,
    key: `y-${y}`,
  }
}

export function shiftBookPeriodAnchor(
  type: BookPeriodType,
  anchor: Date,
  delta: -1 | 1,
): Date {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())

  if (type === "week") {
    d.setDate(d.getDate() + delta * 7)
    return d
  }
  if (type === "month") {
    d.setMonth(d.getMonth() + delta)
    return d
  }
  if (type === "quarter") {
    d.setMonth(d.getMonth() + delta * 3)
    return d
  }
  if (type === "half") {
    d.setMonth(d.getMonth() + delta * 6)
    return d
  }
  d.setFullYear(d.getFullYear() + delta)
  return d
}

/** 최근 N개 기간의 요약 (차트용) */
export function buildBookPeriodTrend(
  books: Book[],
  type: BookPeriodType,
  count: number,
  anchor: Date = new Date(),
  context?: BookPeriodStatisticsContext,
): { label: string; registered: number; completed: number; reading: number }[] {
  const rows: { label: string; registered: number; completed: number; reading: number }[] =
    []
  let cursor = anchor
  for (let i = 0; i < count; i++) {
    const range = getBookPeriodRange(type, cursor)
    const analysis = analyzeBooksInPeriod(books, range, context)
    rows.unshift({
      label: shortenTrendLabel(range),
      registered: analysis.registered.length,
      completed: analysis.completed.length,
      reading: analysis.reading.length,
    })
    cursor = shiftBookPeriodAnchor(type, cursor, -1)
  }
  return rows
}

function shortenTrendLabel(range: BookPeriodRange): string {
  if (range.type === "week") {
    const s = parseYmd(range.start)
    if (!s) return range.label
    return `${s.getMonth() + 1}/${s.getDate()}`
  }
  if (range.type === "month") {
    const s = parseYmd(range.start)
    if (!s) return range.label
    return `${s.getFullYear()}.${s.getMonth() + 1}`
  }
  if (range.type === "quarter") {
    const m = /^(\d{4})년 (\d)분기/.exec(range.label)
    return m ? `${m[1].slice(2)}Q${m[2]}` : range.label
  }
  if (range.type === "half") {
    return range.label.includes("상반기") ? "상반기" : "하반기"
  }
  return range.label.replace("년", "")
}

function wasReadingDuringPeriod(
  book: Book,
  start: string,
  end: string,
): boolean {
  if (book.status === "want-to-read" && !book.hasStartedReading) return false
  const startDate = book.startDate?.trim().split("T")[0]
  if (!startDate) return book.status === "reading"
  if (startDate > end) return false

  const completed = book.completedDate?.trim().split("T")[0]
  if (book.status === "reading") return startDate <= end
  if (completed) {
    return completed >= start
  }
  return startDate <= end
}

export function analyzeBooksInPeriod(
  books: Book[],
  range: BookPeriodRange,
  context?: BookPeriodStatisticsContext,
): BookPeriodAnalysis {
  const { start, end } = range
  const sessionsByBookId = context?.sessionsByBookId

  const registered: Book[] = []
  const completed: Book[] = []
  const reading: Book[] = []
  const started: Book[] = []
  const readingStarted: Book[] = []
  const wantToRead: Book[] = []
  const onHold: Book[] = []

  for (const book of books) {
    const bookSessions = sessionsByBookId?.get(book.id)

    const regDate = getBookRegisteredDate(book)
    if (regDate && isYmdInRange(regDate, start, end)) {
      registered.push(book)
      if (book.status === "want-to-read") wantToRead.push(book)
      if (book.status === "on-hold") onHold.push(book)
    }

    if (
      book.status === "completed" &&
      isYmdInRange(book.completedDate, start, end)
    ) {
      completed.push(book)
    }

    const effectiveStart = getEffectiveReadingStartDate(book, bookSessions)
    if (effectiveStart && isYmdInRange(effectiveStart, start, end)) {
      started.push(book)
    }

    if (
      startedReadingInPeriodWithoutCompletionByPeriodEnd(
        book,
        range,
        bookSessions,
      )
    ) {
      readingStarted.push(book)
    }

    if (wasReadingDuringPeriod(book, start, end)) {
      reading.push(book)
    }
  }

  const ratingSum = completed.reduce((acc, b) => acc + (b.rating || 0), 0)
  const rated = completed.filter((b) => b.rating > 0)
  const averageCompletedRating =
    rated.length > 0 ? Math.round((ratingSum / rated.length) * 10) / 10 : null

  const kdcMap = new Map<string, number>()
  for (const book of completed) {
    const label = book.kdcMajorLabel?.trim() || "미분류"
    kdcMap.set(label, (kdcMap.get(label) ?? 0) + 1)
  }
  const kdcMajorCounts = [...kdcMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  const byTitle = (a: Book, b: Book) => a.title.localeCompare(b.title, "ko")
  registered.sort(byTitle)
  completed.sort((a, b) =>
    (b.completedDate ?? "").localeCompare(a.completedDate ?? ""),
  )
  reading.sort(byTitle)
  started.sort(byTitle)
  readingStarted.sort((a, b) => {
    const sa =
      getEffectiveReadingStartDate(a, sessionsByBookId?.get(a.id)) ?? ""
    const sb =
      getEffectiveReadingStartDate(b, sessionsByBookId?.get(b.id)) ?? ""
    return sb.localeCompare(sa)
  })
  wantToRead.sort(byTitle)
  onHold.sort(byTitle)

  return {
    range,
    registered,
    completed,
    reading,
    started,
    readingStarted,
    wantToRead,
    onHold,
    averageCompletedRating,
    kdcMajorCounts,
  }
}

/** 허브 미리보기: 이번 달·현재 읽는 중 등 */
export function getBookStatisticsSnapshot(books: Book[]) {
  const now = new Date()
  const thisMonth = getBookPeriodRange("month", now)
  const monthAnalysis = analyzeBooksInPeriod(books, thisMonth)
  const readingNow = books.filter((b) => b.status === "reading")
  const completedAll = books.filter((b) => b.status === "completed")
  const wantToRead = books.filter((b) => b.status === "want-to-read")

  return {
    thisMonth,
    monthAnalysis,
    readingNowCount: readingNow.length,
    completedAllCount: completedAll.length,
    wantToReadCount: wantToRead.length,
    registeredThisMonth: monthAnalysis.registered.length,
    completedThisMonth: monthAnalysis.completed.length,
  }
}

export function booksForPeriodMetric(
  analysis: BookPeriodAnalysis,
  metric: BookPeriodMetricKey,
): Book[] {
  switch (metric) {
    case "registered":
      return analysis.registered
    case "completed":
      return analysis.completed
    case "reading":
      return analysis.reading
    case "started":
      return analysis.started
    case "readingStarted":
      return analysis.readingStarted
    case "wantToRead":
      return analysis.wantToRead
    case "onHold":
      return analysis.onHold
  }
}

export type WeeklyBreakdownRow = {
  range: BookPeriodRange
  count: number
  books: Book[]
}

/** 월·분기 등 긴 기간을 주 단위로 나눠 지표별 권수 집계 */
export function buildWeeklyBreakdownInRange(
  books: Book[],
  parentRange: BookPeriodRange,
  metric: BookPeriodMetricKey,
  context?: BookPeriodStatisticsContext,
): WeeklyBreakdownRow[] {
  const parentStart = parseYmd(parentRange.start)
  const parentEnd = parseYmd(parentRange.end)
  if (!parentStart || !parentEnd) return []

  let cursor = startOfWeekMonday(parentStart)
  const rows: WeeklyBreakdownRow[] = []
  const seen = new Set<string>()

  while (cursor <= parentEnd) {
    const weekRange = getBookPeriodRange("week", cursor)
    if (seen.has(weekRange.key)) break
    seen.add(weekRange.key)

    const weekStart = parseYmd(weekRange.start)!
    const weekEnd = parseYmd(weekRange.end)!
    if (weekEnd < parentStart) {
      cursor = shiftBookPeriodAnchor("week", cursor, 1)
      continue
    }
    if (weekStart > parentEnd) break

    const analysis = analyzeBooksInPeriod(books, weekRange, context)
    const weekBooks = booksForPeriodMetric(analysis, metric)
    rows.push({
      range: weekRange,
      count: weekBooks.length,
      books: weekBooks,
    })

    cursor = shiftBookPeriodAnchor("week", cursor, 1)
  }

  return rows
}

export type CompletionClusterInsight = {
  peakWeekLabel: string
  peakCount: number
  peakSharePercent: number
  message: string
} | null

/** 완독이 특정 주에 몰린 경우 안내 문구 */
export function getCompletionClusterInsight(
  weeklyRows: WeeklyBreakdownRow[],
  totalCompleted: number,
): CompletionClusterInsight {
  if (totalCompleted < 2 || weeklyRows.length === 0) return null

  const peak = weeklyRows.reduce((best, row) =>
    row.count > best.count ? row : best,
  )
  if (peak.count === 0) return null

  const share = Math.round((peak.count / totalCompleted) * 100)
  if (share < 40) return null

  const avg = totalCompleted / weeklyRows.filter((r) => r.count > 0).length
  const isHeavy = peak.count >= avg * 1.8

  if (!isHeavy && share < 50) return null

  return {
    peakWeekLabel: peak.range.label,
    peakCount: peak.count,
    peakSharePercent: share,
    message:
      share >= 50
        ? `이 기간 완독의 ${share}%(${peak.count}권)가 ${peak.range.label}에 몰려 있습니다. 완독일 기준이라 실제 읽기 속도와는 다를 수 있어요.`
        : `완독이 ${peak.range.label}에 ${peak.count}권으로 상대적으로 몰려 있습니다.`,
  }
}

/** 단일 지표 추이 (모달·집중 뷰) */
export function buildSingleMetricTrend(
  books: Book[],
  type: BookPeriodType,
  metric: BookPeriodMetricKey,
  count: number,
  anchor: Date = new Date(),
  context?: BookPeriodStatisticsContext,
): { label: string; count: number }[] {
  const rows: { label: string; count: number }[] = []
  let cursor = anchor
  for (let i = 0; i < count; i++) {
    const range = getBookPeriodRange(type, cursor)
    const analysis = analyzeBooksInPeriod(books, range, context)
    rows.unshift({
      label: shortenTrendLabel(range),
      count: booksForPeriodMetric(analysis, metric).length,
    })
    cursor = shiftBookPeriodAnchor(type, cursor, -1)
  }
  return rows
}

export function isRangeIncludingToday(range: BookPeriodRange): boolean {
  const today = formatYmd(new Date())
  return range.start <= today && today <= range.end
}

export function formatBookStatDate(
  book: Book,
  kind: "registered" | "completed" | "started",
  sessions?: ReadingSession[],
): string {
  if (kind === "registered") {
    return getBookRegisteredDate(book) ?? "—"
  }
  if (kind === "completed") {
    return book.completedDate?.split("T")[0] ?? "—"
  }
  return getEffectiveReadingStartDate(book, sessions) ?? "—"
}
