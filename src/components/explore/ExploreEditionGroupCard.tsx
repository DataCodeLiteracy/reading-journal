"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  ListTree,
  Plus,
  ScrollText,
  Users,
} from "lucide-react"
import type { Book } from "@/types/book"
import type { ExploreTitleGroup } from "@/types/explore"
import type { ExploreEditionHighlights } from "@/services/exploreEditionHighlightsService"
import ExploreRegistrantsPanel from "@/components/explore/ExploreRegistrantsPanel"
import {
  pickExploreGroupDisplayBook,
  truncateExploreNotes,
} from "@/utils/exploreGroupDisplayMeta"
import { formatBookPublishedFullLabel } from "@/utils/bookLibraryCardMeta"

type ExploreEditionGroupCardProps = {
  group: ExploreTitleGroup
  highlights?: ExploreEditionHighlights
  highlightsLoading?: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  iHaveThisEdition: boolean
  userUid?: string | null
  onAddBook: (book: Book) => void
  isAddingThisEdition?: boolean
  adminActions?: ReactNode
}

/** BookDetailHeroCard InfoRow와 동일한 라벨·값 레이아웃 */
const EXPLORE_INFO_LABEL_COL = "grid-cols-[2.625rem_1fr]"

function ExploreMetaRow({
  label,
  children,
  align = "center",
}: {
  label: string
  children: ReactNode
  align?: "center" | "top"
}) {
  const top = align === "top"
  return (
    <div
      className={`grid ${EXPLORE_INFO_LABEL_COL} gap-x-[2px] ${
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
      <div className="min-w-0 text-xs leading-4 [&_p]:m-0 [&_p]:leading-4">
        {children}
      </div>
    </div>
  )
}

function CoverColumnHighlights({
  highlights,
  loading,
  userCount,
}: {
  highlights?: ExploreEditionHighlights
  loading?: boolean
  userCount: number
}) {
  if (loading) {
    return (
      <p className="w-full text-center text-[10px] leading-tight text-theme-tertiary">
        …
      </p>
    )
  }

  const countAccentClass =
    "font-semibold tabular-nums text-violet-600 dark:text-violet-400"

  const items: {
    key: string
    shortLabel: ReactNode
    fullLabel: string
    icon: ReactNode
  }[] = [
    {
      key: "users",
      shortLabel: (
        <>
          <span className={countAccentClass}>{userCount}</span>
          <span>명</span>
        </>
      ),
      fullLabel: `${userCount}명 등록`,
      icon: <Users className="h-3 w-3 shrink-0" aria-hidden />,
    },
  ]

  if (highlights?.hasToc) {
    items.push({
      key: "toc",
      shortLabel: (
        <>
          목차 <span className={countAccentClass}>{highlights.tocChapterCount}</span>
        </>
      ),
      fullLabel: `목차 ${highlights.tocChapterCount}개`,
      icon: <ListTree className="h-3 w-3 shrink-0" aria-hidden />,
    })
  }
  if (highlights?.hasReadingExam) {
    items.push({
      key: "exam",
      shortLabel: (
        <>
          점검 <span className={countAccentClass}>{highlights.examQuestionCount}</span>
        </>
      ),
      fullLabel: `이해도 점검 ${highlights.examQuestionCount}문항`,
      icon: <ClipboardList className="h-3 w-3 shrink-0" aria-hidden />,
    })
  }
  if (highlights?.hasReadingExcerpt) {
    items.push({
      key: "excerpt",
      shortLabel: (
        <>
          발췌{" "}
          <span className={countAccentClass}>{highlights.excerptChapterCount}</span>
        </>
      ),
      fullLabel: `발췌 ${highlights.excerptChapterCount}개`,
      icon: <ScrollText className="h-3 w-3 shrink-0" aria-hidden />,
    })
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-1">
      {items.map((item) => (
        <span
          key={item.key}
          title={item.fullLabel}
          className="flex w-full max-w-full flex-row items-center justify-center gap-1 rounded-md bg-theme-tertiary/60 px-1 py-1 text-[10px] leading-tight text-theme-secondary"
        >
          {item.icon}
          <span className="inline-flex min-w-0 items-baseline gap-px truncate">
            {item.shortLabel}
          </span>
        </span>
      ))}
    </div>
  )
}

export default function ExploreEditionGroupCard({
  group,
  highlights,
  highlightsLoading,
  isExpanded,
  onToggleExpand,
  iHaveThisEdition,
  userUid,
  onAddBook,
  isAddingThisEdition = false,
  adminActions,
}: ExploreEditionGroupCardProps) {
  const seedBook = group.books[0]
  const displayBook = pickExploreGroupDisplayBook(group.books) ?? seedBook
  const d1 = displayBook?.categoryDepth1Label?.trim()
  const d2 = displayBook?.categoryDepth2Label?.trim()
  const pubLabel = formatBookPublishedFullLabel(displayBook?.publishedDate)
  const notesPreview = displayBook
    ? truncateExploreNotes(displayBook.notes, 65)
    : null
  const notesFull = displayBook?.notes?.trim()

  return (
    <article className="overflow-hidden rounded-lg border-card bg-theme-secondary shadow-sm">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex w-14 shrink-0 flex-col gap-1.5">
            <div className="relative h-[4.5rem] w-full overflow-hidden rounded-md bg-theme-tertiary shadow-sm">
              {group.coverUrl ? (
                <Image
                  src={group.coverUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-7 w-7 text-theme-tertiary" />
                </div>
              )}
            </div>
            <CoverColumnHighlights
              highlights={highlights}
              loading={highlightsLoading}
              userCount={group.userCount}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5">
              <h3 className="col-start-1 row-start-1 font-semibold leading-snug text-theme-primary line-clamp-2">
                {group.title}
              </h3>
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-label={
                  isExpanded ? "등록 유저 목록 접기" : "등록 유저 목록 펼치기"
                }
                onClick={onToggleExpand}
                className="col-start-2 row-start-1 shrink-0 rounded-md p-1 text-theme-tertiary transition-colors hover:bg-theme-tertiary/50 hover:text-theme-primary"
              >
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div className="col-span-2 flex flex-col gap-1.5 pt-0.5">
                <ExploreMetaRow label="저자">
                  <p className="line-clamp-3 break-words leading-4 text-slate-600 dark:text-slate-400 [overflow-wrap:anywhere]">
                    {group.author?.trim() || "저자 미상"}
                  </p>
                </ExploreMetaRow>
                <ExploreMetaRow label="출판사">
                  {group.publisher?.trim() ? (
                    <p className="break-words font-medium leading-4 text-sky-700 dark:text-sky-300 [overflow-wrap:anywhere]">
                      {group.publisher.trim()}
                    </p>
                  ) : (
                    <p className="leading-4 text-theme-tertiary">미입력</p>
                  )}
                </ExploreMetaRow>
                <ExploreMetaRow label="분야">
                  {d1 || d2 ? (
                    <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-4">
                      {d1 && (
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          {d1}
                        </span>
                      )}
                      {d1 && d2 && (
                        <span className="text-theme-tertiary/50" aria-hidden>
                          ›
                        </span>
                      )}
                      {d2 && (
                        <span className="font-medium text-teal-700 dark:text-teal-300">
                          {d2}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="leading-4 text-theme-tertiary">미입력</p>
                  )}
                </ExploreMetaRow>
                <ExploreMetaRow label="출판일">
                  {pubLabel ? (
                    <span className="inline-block break-words font-medium leading-4 text-amber-700/70 dark:text-amber-300/70 [overflow-wrap:anywhere]">
                      {pubLabel}
                    </span>
                  ) : (
                    <p className="leading-4 text-theme-tertiary">미입력</p>
                  )}
                </ExploreMetaRow>
                {notesPreview && (
                  <ExploreMetaRow label="비고" align="top">
                    <p
                      className="break-words leading-4 text-theme-secondary [overflow-wrap:anywhere]"
                      title={notesFull}
                    >
                      {notesPreview}
                    </p>
                  </ExploreMetaRow>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {userUid && !iHaveThisEdition && seedBook && !isExpanded && (
        <div className="flex justify-end border-t border-theme-tertiary px-3 py-2.5">
          <button
            type="button"
            onClick={() => onAddBook(seedBook)}
            disabled={isAddingThisEdition}
            className="inline-flex items-center gap-1 rounded-md bg-accent-theme px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            {isAddingThisEdition ? "등록 중…" : "내 책으로 추가"}
          </button>
        </div>
      )}

      {isExpanded && (
        <ExploreRegistrantsPanel
          books={group.books}
          canonicalBookId={group.canonicalBookId}
          currentUserUid={userUid}
          adminActions={adminActions}
        />
      )}
    </article>
  )
}
