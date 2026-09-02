"use client"

import { useMemo } from "react"
import type { ReadingSession } from "@/types/user"
import Image from "next/image"
import { BookOpen } from "lucide-react"
import type { Book } from "@/types/book"
import type { BookPeriodMetricKey } from "@/types/bookPeriodStatistics"
import { BOOK_PERIOD_METRIC_LABELS } from "@/types/bookPeriodStatistics"
import { formatBookStatDate, buildSessionsByBookId } from "@/utils/bookPeriodStatistics"

const DATE_KIND: Record<
  BookPeriodMetricKey,
  "registered" | "completed" | "started"
> = {
  registered: "registered",
  completed: "completed",
  reading: "started",
  started: "started",
  readingStarted: "started",
  wantToRead: "registered",
  onHold: "registered",
}

type Props = {
  books: Book[]
  metric: BookPeriodMetricKey
  readingSessions?: ReadingSession[]
}

export default function BookPeriodBookList({
  books,
  metric,
  readingSessions = [],
}: Props) {
  const meta = BOOK_PERIOD_METRIC_LABELS[metric]
  const dateKind = DATE_KIND[metric]
  const sessionsByBookId = useMemo(
    () =>
      readingSessions.length > 0
        ? buildSessionsByBookId(readingSessions)
        : undefined,
    [readingSessions],
  )

  if (books.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-theme-tertiary/50 bg-theme-secondary/50 px-4 py-10 text-center">
        <BookOpen className="mx-auto mb-2 h-8 w-8 text-theme-tertiary" />
        <p className="text-sm font-medium text-theme-primary">
          {meta.title} 책이 없습니다
        </p>
        <p className="mt-1 text-xs text-theme-secondary">{meta.description}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary">
      <div className="border-b border-theme-tertiary/30 px-4 py-3">
        <h3 className="text-sm font-semibold text-theme-primary">
          {meta.title}{" "}
          <span className="font-normal text-theme-secondary">
            ({books.length}권)
          </span>
        </h3>
        <p className="text-xs text-theme-tertiary">{meta.description}</p>
      </div>
      <ul className="divide-y divide-theme-tertiary/20">
        {books.map((book) => (
          <li key={book.id} className="flex gap-3 px-4 py-3">
            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-theme-tertiary">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-4 w-4 text-theme-tertiary" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-theme-primary">
                {book.title}
              </p>
              <p className="truncate text-xs text-theme-secondary">
                {book.author?.trim() || "저자 미상"}
                {book.publisher ? ` · ${book.publisher}` : ""}
              </p>
              <p className="mt-0.5 text-[11px] text-theme-tertiary">
                {dateKind === "registered" && "등록 "}
                {dateKind === "completed" && "완독 "}
                {dateKind === "started" && "시작 "}
                {formatBookStatDate(
                  book,
                  dateKind,
                  sessionsByBookId?.get(book.id),
                )}
                {book.rating > 0 && dateKind === "completed" && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    ★ {book.rating}
                  </span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
