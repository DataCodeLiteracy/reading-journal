import type { Book } from "@/types/book"
import type { ReadingSession } from "@/types/user"
import {
  computeReadingDaysCount,
  computeReadingPeriodSpan,
  computeReadingYearMonths,
  computeReadingYears,
  getDistinctSessionDates,
} from "@/utils/bookReadingStats"

export const BOOK_NOTION_CSV_HEADERS = [
  "책 제목",
  "비고",
  "저자",
  "출판사",
  "문해력 수준",
  "대분류",
  "중분류",
  "상태",
  "시작 날짜",
  "완료 날짜",
  "연",
  "월",
  "읽은 기간",
  "읽은 일수",
  "평점",
  "한 줄 평",
  "회독수",
  "읽은 사람",
  "이번 년도에 읽을 책",
  "출판일",
] as const

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function mapBookStatusToKorean(status: Book["status"]): string {
  switch (status) {
    case "completed":
      return "읽음"
    case "reading":
      return "읽는 중"
    case "on-hold":
      return "보류"
    case "want-to-read":
    default:
      return "읽기 전"
  }
}

export type BookNotionCsvRowInput = {
  book: Book
  sessions: ReadingSession[]
  readerName: string
}

export function buildBookNotionCsvRow({
  book,
  sessions,
  readerName,
}: BookNotionCsvRowInput): string[] {
  const sessionDates = getDistinctSessionDates(sessions)
  const daysRead = computeReadingDaysCount(sessionDates)
  const years = computeReadingYears(sessionDates)
  const months = computeReadingYearMonths(sessionDates)
  const readingPeriod = computeReadingPeriodSpan(
    sessionDates,
    book.startDate,
    book.completedDate
  )

  return [
    book.title ?? "",
    book.notes ?? "",
    book.author ?? "",
    book.publisher ?? "",
    book.level ?? "",
    book.categoryDepth1Label ?? "",
    book.categoryDepth2Label ?? "",
    mapBookStatusToKorean(book.status),
    book.startDate ?? "",
    book.completedDate ?? "",
    years.join(", "),
    months.join(", "),
    readingPeriod,
    daysRead > 0 ? String(daysRead) : "",
    book.rating > 0 ? String(book.rating) : "",
    book.review ?? "",
    String(book.rereadCount ?? 0),
    readerName,
    book.toReadThisYear ? "Yes" : "No",
    book.publishedDate ?? "",
  ]
}

export function buildBooksNotionCsv(
  rows: BookNotionCsvRowInput[]
): string {
  const lines = [
    BOOK_NOTION_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      buildBookNotionCsvRow(row).map(escapeCsvCell).join(",")
    ),
  ]
  return "\uFEFF" + lines.join("\n")
}
