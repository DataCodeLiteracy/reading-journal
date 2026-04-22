"use client"

import { useMemo } from "react"
import { ChevronLeft, X } from "lucide-react"
import type { BookTocEntry } from "@/types/bookToc"
import { normalizeBookTocStartPage } from "@/utils/bookToc"
import { buildTocTreeFromEntries, type TocTreeNode } from "@/utils/bookTocTree"
import {
  DraggableBottomSheet,
  useDraggableSheetRequestClose,
} from "@/components/ui/DraggableBottomSheet"

type BookTocViewModalProps = {
  open: boolean
  onClose: () => void
  entries: BookTocEntry[]
}

/** 경로(1, 1.1…) — 제목과 색·체 구분 */
const tocViewPathClass =
  "shrink-0 font-mono text-[13px] font-semibold tabular-nums text-sky-800 dark:text-sky-300"
/** 시작 N쪽 — 경로·제목과 구분되는 연한 회색만 */
const tocViewStartClass =
  "shrink-0 text-[13px] font-medium tabular-nums text-slate-400 dark:text-slate-500"
const tocViewTitleClass =
  "min-w-0 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white"

function TocViewBranch({
  node,
  entries,
  depth,
}: {
  node: TocTreeNode
  entries: BookTocEntry[]
  depth: number
}) {
  const row = entries[node.entryIndex]!
  const pad = 12 + depth * 14
  const startPage = normalizeBookTocStartPage(row.startPage)

  return (
    <li className='list-none'>
      <div
        className='border-b border-black/[0.08] py-2.5 pr-3 text-sm dark:border-white/[0.12]'
        style={{ paddingLeft: pad }}
      >
        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
          <span className={tocViewPathClass}>{node.path}</span>
          <span className={tocViewTitleClass}>{row.title}</span>
          {startPage != null ? (
            <span className={tocViewStartClass}>
              시작 <span className='tabular-nums'>{startPage}</span>쪽
            </span>
          ) : null}
        </div>
      </div>
      {node.children.length > 0 ? (
        <ul className='m-0 p-0'>
          {node.children.map((ch) => (
            <TocViewBranch
              key={ch.path}
              node={ch}
              entries={entries}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function TocViewSheetBody({
  entries,
  roots,
  orphanIndices,
  hasTree,
  hasOrphans,
  onClose,
}: {
  entries: BookTocEntry[]
  roots: TocTreeNode[]
  orphanIndices: number[]
  hasTree: boolean
  hasOrphans: boolean
  onClose: () => void
}) {
  const requestClose = useDraggableSheetRequestClose()

  const dismiss = () => {
    ;(requestClose ?? onClose)()
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <header className='flex shrink-0 items-center px-2 pb-2.5 pt-0.5'>
        <div className='flex w-11 shrink-0 justify-start'>
          <button
            type='button'
            onClick={dismiss}
            className='rounded-full p-2 text-slate-600 hover:bg-black/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.08]'
            aria-label='뒤로 닫기'
          >
            <ChevronLeft className='h-5 w-5' strokeWidth={2.25} />
          </button>
        </div>
        <h2
          id='toc-view-title'
          className='min-w-0 flex-1 truncate text-center text-base font-semibold text-slate-900 dark:text-white'
        >
          목차 보기
        </h2>
        <div className='flex w-11 shrink-0 justify-end'>
          <button
            type='button'
            onClick={dismiss}
            className='rounded-full p-2 text-slate-600 hover:bg-black/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.08]'
            aria-label='닫기'
          >
            <X className='h-5 w-5' />
          </button>
        </div>
      </header>

      <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1rem,calc(12px+env(safe-area-inset-bottom,0px)))]'>
        {!hasTree && !hasOrphans ? (
          <p className='py-6 text-center text-sm text-theme-secondary'>
            표시할 목차가 없습니다. 편집 화면에서 항목을 추가한 뒤 다시 열어 주세요.
          </p>
        ) : null}

        {hasOrphans ? (
          <div className='mb-4 rounded-xl border border-amber-400/45 bg-amber-500/10 px-3 py-2.5 text-xs text-theme-primary dark:border-amber-700/40'>
            <p className='mb-2 font-medium'>연결되지 않은 항목</p>
            <ul className='space-y-2'>
              {orphanIndices.map((idx) => {
                const e = entries[idx]!
                return (
                  <li key={idx} className='text-[11px] leading-snug'>
                    <span className='font-mono font-semibold text-sky-800 dark:text-sky-300'>
                      {e.path || "(경로 없음)"}
                    </span>
                    {e.title ? (
                      <span className={`ml-2 ${tocViewTitleClass} text-sm`}>{e.title}</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {hasTree ? (
          <ul className='m-0 p-0'>
            {roots.map((r) => (
              <TocViewBranch
                key={r.path}
                node={r}
                entries={entries}
                depth={0}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

export function BookTocViewModal({ open, onClose, entries }: BookTocViewModalProps) {
  const { roots, orphanIndices } = useMemo(
    () => buildTocTreeFromEntries(entries),
    [entries],
  )

  const hasTree = roots.length > 0
  const hasOrphans = orphanIndices.length > 0

  return (
    <DraggableBottomSheet
      open={open}
      onClose={onClose}
      zIndexClass='z-[230]'
      backdropClassName='bg-theme-backdrop'
      sheetClassName='rounded-t-[1.75rem] border-0 bg-bottom-sheet-surface shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.22),0_-2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_-24px_56px_-8px_rgba(0,0,0,0.55),0_-2px_14px_rgba(0,0,0,0.35)]'
      contentClassName='flex min-h-0 flex-1 flex-col overflow-hidden p-0'
      aria-labelledby='toc-view-title'
    >
      <TocViewSheetBody
        entries={entries}
        roots={roots}
        orphanIndices={orphanIndices}
        hasTree={hasTree}
        hasOrphans={hasOrphans}
        onClose={onClose}
      />
    </DraggableBottomSheet>
  )
}
