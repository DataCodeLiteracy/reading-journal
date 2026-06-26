"use client"

import { useState, type ReactNode } from "react"
import Image from "next/image"
import FormModalFrame from "@/components/FormModalFrame"
import Link from "next/link"
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  ListTree,
  Sparkles,
  Star,
  Tag,
} from "lucide-react"
import type { Book } from "@/types/book"
import { withReturnQuery } from "@/utils/navigateBack"
import { formatBookPublishedFullLabel } from "@/utils/bookLibraryCardMeta"
import { scrollToElementId } from "@/utils/scrollToElement"

const STATUS_META: Record<
  Book["status"],
  { label: string; className: string }
> = {
  reading: {
    label: "읽는 중",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  completed: {
    label: "완독",
    className: "bg-green-500/15 text-green-700 dark:text-green-300",
  },
  "on-hold": {
    label: "보류",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  "want-to-read": {
    label: "읽고 싶음",
    className: "bg-theme-tertiary text-theme-secondary",
  },
}

function CoverQuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof ListTree
  label: string
}) {
  return (
    <Link
      href={href}
      className='group flex w-full items-center gap-1.5 rounded-md border border-theme-tertiary/70 bg-theme-tertiary/40 px-2 py-1.5 text-[11px] font-medium text-theme-secondary transition-all hover:border-accent-theme/55 hover:bg-accent-theme/10 hover:text-accent-theme active:scale-[0.99]'
    >
      <Icon className='h-3.5 w-3.5 shrink-0' aria-hidden />
      <span className='min-w-0 flex-1 truncate text-left'>{label}</span>
      <ChevronRight
        className='h-3 w-3 shrink-0 opacity-40 group-hover:translate-x-px group-hover:opacity-100'
        aria-hidden
      />
    </Link>
  )
}

const INFO_LABEL_COL = "grid-cols-[2.625rem_1fr]"

function InfoRow({
  label,
  children,
  align = "center",
}: {
  label: string
  children: ReactNode
  /** 비고 등 여러 줄 값은 top, 나머지는 라벨·값 세로 중앙 */
  align?: "center" | "top"
}) {
  const top = align === "top"
  return (
    <div
      className={`grid ${INFO_LABEL_COL} gap-x-[2px] ${
        top ? "items-start" : "items-center"
      }`}
    >
      <span
        className={`text-center text-[11px] font-medium leading-4 text-theme-tertiary ${
          top ? "self-start pt-[1px]" : "self-center"
        }`}
      >
        {label}
      </span>
      <div className='min-w-0 text-xs leading-4 [&_p]:m-0 [&_p]:leading-4'>
        {children}
      </div>
    </div>
  )
}

function BookInfoLabeled({ book }: { book: Book }) {
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const status = STATUS_META[book.status]
  const pubLabel = formatBookPublishedFullLabel(book.publishedDate)
  const hasPublisher = !!book.publisher?.trim()
  const hasDate = !!pubLabel
  const d1 = book.categoryDepth1Label?.trim()
  const d2 = book.categoryDepth2Label?.trim()
  const hasCategory = !!(d1 || d2)
  const notesText = book.notes?.trim() ?? ""

  return (
    <>
    <div className='flex flex-col gap-1.5'>
      <InfoRow label='제목'>
        <p className='line-clamp-3 font-semibold leading-4 text-theme-primary sm:text-sm sm:leading-4'>
          {book.title}
        </p>
      </InfoRow>

      <InfoRow label='저자'>
        <p className='line-clamp-2 leading-4 text-slate-600 dark:text-slate-400'>
          {book.author || "저자 미상"}
        </p>
      </InfoRow>

      <InfoRow label='평점'>
        <div className='flex h-4 items-center gap-px' aria-label={`${book.rating}점`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3.5 w-3.5 ${
                star <= book.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            />
          ))}
        </div>
      </InfoRow>

      <InfoRow label='상태'>
        <div className='flex min-h-4 flex-wrap items-center gap-1.5'>
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${status.className}`}
          >
            {status.label}
          </span>
          {book.toReadThisYear && (
            <span className='rounded bg-indigo-500/12 px-1.5 py-0.5 text-[11px] font-medium text-indigo-800 dark:text-indigo-300'>
              올해 읽을 책
            </span>
          )}
        </div>
      </InfoRow>

      <InfoRow label='출판사'>
        {hasPublisher ? (
          <p className='break-words font-medium leading-4 text-sky-700 dark:text-sky-300'>
            {book.publisher!.trim()}
          </p>
        ) : (
          <p className='leading-4 text-theme-tertiary'>미입력</p>
        )}
      </InfoRow>

      <InfoRow label='출판일'>
        {hasDate ? (
          <span className='inline-block break-words font-medium leading-4 text-amber-700/70 dark:text-amber-300/70'>
            {pubLabel}
          </span>
        ) : (
          <p className='leading-4 text-theme-tertiary'>미입력</p>
        )}
      </InfoRow>

      {hasCategory && (
        <InfoRow label='분야'>
          <p className='flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-4'>
            {d1 && (
              <span className='font-medium text-emerald-700 dark:text-emerald-300'>
                {d1}
              </span>
            )}
            {d1 && d2 && (
              <span className='text-theme-tertiary/50' aria-hidden>
                ›
              </span>
            )}
            {d2 && (
              <span className='font-medium text-teal-700 dark:text-teal-300'>
                {d2}
              </span>
            )}
          </p>
        </InfoRow>
      )}

      {book.level && (
        <InfoRow label='문해력'>
          <span className='inline-block leading-4 font-medium text-theme-primary'>
            {book.level}
          </span>
        </InfoRow>
      )}

      {book.startDate && (
        <InfoRow label='시작'>
          <span className='inline-flex h-4 items-center gap-1 leading-4 text-theme-secondary'>
            <Calendar className='h-3 w-3 shrink-0 text-theme-tertiary' />
            {book.startDate}
          </span>
        </InfoRow>
      )}

      {book.completedDate && (
        <InfoRow label='완독'>
          <span className='inline-flex h-4 items-center gap-1 leading-4 text-green-600 dark:text-green-400'>
            <CheckCircle className='h-3 w-3 shrink-0' />
            {book.completedDate}
          </span>
        </InfoRow>
      )}

      {notesText && (
        <InfoRow label='비고' align='top'>
          <button
            type='button'
            onClick={() => setNotesModalOpen(true)}
            className='group w-full rounded-md text-left transition-colors hover:bg-theme-tertiary/30 -mx-1 px-1'
            aria-label='비고 전체 보기'
          >
            <p className='line-clamp-5 whitespace-pre-wrap leading-4 text-theme-secondary'>
              {notesText}
            </p>
            <span className='mt-0.5 inline-block text-[10px] font-medium text-accent-theme group-hover:underline'>
              전체 보기
            </span>
          </button>
        </InfoRow>
      )}
    </div>

    {notesText && (
      <FormModalFrame
        isOpen={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        title='비고'
      >
        <p className='max-h-[min(60vh,24rem)] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-theme-primary'>
          {notesText}
        </p>
      </FormModalFrame>
    )}
    </>
  )
}

interface BookDetailHeroCardProps {
  book: Book
  bookBasePath: string
  isTimerRunning: boolean
  isOwner: boolean
  totalReadingTime: number
  formatTotalTime: (seconds: number) => string
  heroReadingTimeId: string
  readingSessionsSectionId: string
  onOpenRereadDetail: () => void
}

export default function BookDetailHeroCard({
  book,
  bookBasePath,
  isTimerRunning,
  isOwner,
  totalReadingTime,
  formatTotalTime,
  heroReadingTimeId,
  readingSessionsSectionId,
  onOpenRereadDetail,
}: BookDetailHeroCardProps) {
  if (isTimerRunning) {
    return (
      <div className='mb-4 flex items-center gap-3 rounded-xl bg-theme-secondary p-3 shadow-md'>
        <div className='relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-theme-tertiary'>
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt=''
              fill
              className='object-cover'
              sizes='48px'
              unoptimized
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center'>
              <BookOpen className='h-6 w-6 text-gray-400' aria-hidden />
            </div>
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <h2 className='line-clamp-2 text-base font-semibold text-theme-primary'>
            {book.title}
          </h2>
          <p className='line-clamp-1 text-xs text-theme-secondary'>
            {book.author || "저자 미상"}
          </p>
          <p className='mt-1 flex items-center gap-1 text-sm font-medium text-accent-theme'>
            <Clock className='h-3.5 w-3.5 shrink-0' />
            {formatTotalTime(totalReadingTime)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <article className='mb-4 overflow-hidden rounded-xl bg-theme-secondary shadow-sm'>
      <div className='flex gap-[4px] p-3.5 sm:p-4'>
        <div className='flex w-[5.75rem] shrink-0 flex-col gap-1.5 sm:w-[6.25rem]'>
          <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-theme-tertiary shadow-sm ring-1 ring-theme-tertiary/40'>
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt=''
                fill
                className='object-cover'
                sizes='100px'
                priority
                unoptimized
              />
            ) : (
              <div className='flex h-full w-full items-center justify-center'>
                <BookOpen className='h-9 w-9 text-gray-400' aria-hidden />
              </div>
            )}
          </div>
          {isOwner && (
            <nav
              className='flex w-full flex-col gap-1'
              aria-label='목차·준비·핵심'
            >
              <CoverQuickLink
                href={withReturnQuery(`${bookBasePath}/toc`, bookBasePath)}
                icon={ListTree}
                label='목차'
              />
              <CoverQuickLink
                href={`${bookBasePath}/pre-reading?return=${encodeURIComponent(bookBasePath)}`}
                icon={Sparkles}
                label='준비'
              />
              <CoverQuickLink
                href={withReturnQuery(`${bookBasePath}/takeaways`, bookBasePath)}
                icon={Tag}
                label='핵심'
              />
            </nav>
          )}
        </div>

        <div className='min-w-0 flex-1'>
          <BookInfoLabeled book={book} />
        </div>
      </div>

      <div className='grid grid-cols-2 border-t border-theme-tertiary/50'>
        <button
          type='button'
          id={heroReadingTimeId}
          onClick={() => scrollToElementId(readingSessionsSectionId)}
          className='scroll-mt-20 flex items-center gap-2.5 border-r border-theme-tertiary/50 bg-accent-theme/8 px-3.5 py-3 text-left transition-colors hover:bg-accent-theme/15 sm:px-4'
          aria-label='독서 기록 목록으로 이동'
        >
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-theme/15'>
            <Clock className='h-4 w-4 text-accent-theme' aria-hidden />
          </div>
          <div className='min-w-0'>
            <p className='text-[11px] font-medium text-theme-tertiary'>총 독서 시간</p>
            <p className='truncate text-sm font-semibold text-theme-primary sm:text-base'>
              {formatTotalTime(totalReadingTime)}
            </p>
          </div>
        </button>
        <button
          type='button'
          onClick={onOpenRereadDetail}
          className='flex items-center gap-2.5 bg-violet-500/8 px-3.5 py-3 text-left transition-colors hover:bg-violet-500/15 sm:px-4'
        >
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15'>
            <BookOpen className='h-4 w-4 text-violet-600 dark:text-violet-300' aria-hidden />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-[11px] font-medium text-theme-tertiary'>회독</p>
            <p className='flex items-center gap-0.5 text-sm font-semibold text-violet-700 dark:text-violet-200 sm:text-base'>
              {book.rereadCount ?? 0}회
              <ChevronRight className='h-4 w-4 shrink-0 opacity-70' aria-hidden />
            </p>
          </div>
        </button>
      </div>
    </article>
  )
}
