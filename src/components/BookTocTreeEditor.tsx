"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import type { BookTocEntry } from "@/types/bookToc"
import { BOOK_TOC_MAX_DEPTH } from "@/types/bookToc"
import { normalizeBookTocPath } from "@/utils/bookToc"
import {
  buildTocTreeFromEntries,
  nextChildPath,
  nextRootPath,
  nextSiblingPath,
  pathDepth,
  removeEntryAndDescendants,
  type TocTreeNode,
} from "@/utils/bookTocTree"

/** 모바일에서 depth당 들여쓰기(px). 최대 4단 → 약 52px까지 */
const INDENT_PER_DEPTH_PX = 13

type Props = {
  entries: BookTocEntry[]
  onEntriesChangeAction: (next: BookTocEntry[]) => void
  disabled?: boolean
}

type FlatRow = { node: TocTreeNode; depth: number }

function collectVisibleRows(
  nodes: TocTreeNode[],
  expandedPaths: Set<string>,
  depth: number,
  out: FlatRow[],
): void {
  for (const node of nodes) {
    out.push({ node, depth })
    const hasChildren = node.children.length > 0
    const open = expandedPaths.has(node.path)
    if (hasChildren && open) {
      collectVisibleRows(node.children, expandedPaths, depth + 1, out)
    }
  }
}

function PathTrail({ path }: { path: string }) {
  const parts = path.split(".")
  return (
    <div
      className='flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 font-mono text-[11px] leading-tight tracking-tight text-theme-tertiary sm:text-xs'
      aria-label={`목차 경로 ${path}`}
    >
      {parts.map((seg, i) => (
        <span key={`${i}-${seg}`} className='inline-flex items-baseline gap-1'>
          {i > 0 ? (
            <span className='select-none text-theme-tertiary/70' aria-hidden>
              ·
            </span>
          ) : null}
          <span
            className={
              i === parts.length - 1
                ? "font-semibold text-theme-primary"
                : "text-theme-secondary"
            }
          >
            {seg}
          </span>
        </span>
      ))}
    </div>
  )
}

type RowBlockProps = {
  node: TocTreeNode
  depth: number
  entries: BookTocEntry[]
  expandedPaths: Set<string>
  onToggleExpand: (path: string) => void
  onPatch: (index: number, patch: Partial<BookTocEntry>) => void
  onRemoveBranch: (path: string) => void
  onAddChild: (parentPath: string) => void
  onAddSibling: (siblingPath: string) => void
  disabled?: boolean
}

function TocRowBlock({
  node,
  depth,
  entries,
  expandedPaths,
  onToggleExpand,
  onPatch,
  onRemoveBranch,
  onAddChild,
  onAddSibling,
  disabled,
}: RowBlockProps) {
  const entry = entries[node.entryIndex]!
  const hasChildren = node.children.length > 0
  const isOpen = expandedPaths.has(node.path)
  const canAddChild = pathDepth(node.path) < BOOK_TOC_MAX_DEPTH
  const depthPx = 10 + depth * INDENT_PER_DEPTH_PX

  return (
    <div className='py-3.5 pl-3 pr-1 sm:px-4' style={{ paddingLeft: depthPx }}>
      <div className='flex min-w-0 items-start gap-2'>
        <button
          type='button'
          onClick={() => onToggleExpand(node.path)}
          className={`mt-0.5 shrink-0 rounded-md p-1 text-theme-tertiary hover:bg-theme-tertiary/35 ${
            hasChildren ? "" : "pointer-events-none invisible"
          }`}
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-label={
            hasChildren ? (isOpen ? "하위 목차 접기" : "하위 목차 펼치기") : undefined
          }
          disabled={!hasChildren || disabled}
        >
          {hasChildren &&
            (isOpen ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            ))}
        </button>
        <div className='min-w-0 flex-1 space-y-2'>
          <PathTrail path={node.path} />
          <input
            type='text'
            value={entry.title}
            onChange={(e) => onPatch(node.entryIndex, { title: e.target.value })}
            disabled={disabled}
            className='form-control w-full min-w-0 text-[15px] sm:text-sm'
            placeholder='이 단계의 제목 (예: 1장 서론)'
            aria-label={`${node.path} 제목`}
          />
          <div className='flex flex-wrap items-center gap-2 gap-y-2'>
            <label className='flex min-w-0 items-center gap-1.5 text-xs text-theme-tertiary'>
              <span className='shrink-0 whitespace-nowrap'>시작 쪽</span>
              <input
                type='number'
                inputMode='numeric'
                min={1}
                value={entry.startPage ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === "") onPatch(node.entryIndex, { startPage: undefined })
                  else {
                    const n = parseInt(v, 10)
                    if (!Number.isNaN(n)) onPatch(node.entryIndex, { startPage: n })
                  }
                }}
                disabled={disabled}
                className='form-control h-9 w-[5.5rem] min-w-0 px-2 text-sm sm:w-24'
                placeholder='선택'
                aria-label={`${node.path} 시작 쪽`}
              />
            </label>
            <div className='ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2'>
              <button
                type='button'
                disabled={disabled}
                onClick={() => onAddSibling(node.path)}
                className='inline-flex h-9 items-center gap-1 rounded-lg border border-theme-tertiary bg-theme-secondary px-2.5 text-xs font-medium text-theme-primary hover:bg-theme-tertiary disabled:opacity-50'
                aria-label={`${node.path}과 같은 단계 목차 추가`}
              >
                <Plus className='h-3.5 w-3.5' />
                동급
              </button>
              {canAddChild ? (
                <button
                  type='button'
                  disabled={disabled}
                  onClick={() => onAddChild(node.path)}
                  className='inline-flex h-9 items-center gap-1 rounded-lg border border-accent-theme/35 bg-accent-theme/10 px-2.5 text-xs font-medium text-accent-theme hover:bg-accent-theme/18 disabled:opacity-50'
                >
                  <Plus className='h-3.5 w-3.5' />
                  하위
                </button>
              ) : null}
              <button
                type='button'
                disabled={disabled}
                onClick={() => onRemoveBranch(node.path)}
                className='inline-flex h-9 items-center justify-center rounded-lg px-2 text-theme-tertiary hover:bg-red-500/12 hover:text-red-600 disabled:opacity-50'
                aria-label={`${node.path} 및 하위 삭제`}
              >
                <Trash2 className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BookTocTreeEditor({
  entries,
  onEntriesChangeAction,
  disabled,
}: Props) {
  /** 비어 있으면 전부 접힘 → 최상위만 보임 */
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(),
  )

  const { roots, orphanIndices } = useMemo(
    () => buildTocTreeFromEntries(entries),
    [entries],
  )

  const flatRows = useMemo(() => {
    const out: FlatRow[] = []
    collectVisibleRows(roots, expandedPaths, 0, out)
    return out
  }, [roots, expandedPaths])

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const onPatch = (index: number, patch: Partial<BookTocEntry>) => {
    onEntriesChangeAction(
      entries.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    )
  }

  const onRemoveBranch = (path: string) => {
    const n = normalizeBookTocPath(path)
    if (!n) return
    onEntriesChangeAction(removeEntryAndDescendants(entries, n))
  }

  const onAddChild = (parentPath: string) => {
    const np = nextChildPath(entries, parentPath)
    if (!np) return
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      next.add(parentPath)
      return next
    })
    onEntriesChangeAction([...entries, { path: np, title: "" }])
  }

  const onAddSibling = (siblingPath: string) => {
    const np = nextSiblingPath(entries, siblingPath)
    if (!np) return
    onEntriesChangeAction([...entries, { path: np, title: "" }])
  }

  const addRoot = () => {
    onEntriesChangeAction([
      ...entries,
      { path: nextRootPath(entries), title: "" },
    ])
  }

  const removeAt = (index: number) => {
    onEntriesChangeAction(entries.filter((_, i) => i !== index))
  }

  const hasTree = roots.length > 0 || orphanIndices.length > 0

  return (
    <div className='space-y-5'>
      {orphanIndices.length > 0 ? (
        <div className='rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-3 text-sm text-theme-primary dark:border-amber-700/45 dark:bg-amber-950/25'>
          <p className='mb-3 font-medium leading-snug'>
            상위가 없는 항목이 있어요. 위에서 상위 목차를 먼저 만들거나, 아래 경로를
            고쳐 주세요.
          </p>
          <div className='divide-y divide-amber-700/15 dark:divide-amber-500/20'>
            {orphanIndices.map((idx) => {
              const row = entries[idx]!
              return (
                <div
                  key={idx}
                  className='flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-end sm:gap-3'
                >
                  <div className='min-w-0 flex-1 space-y-2'>
                    <label className='block text-xs text-theme-tertiary'>경로</label>
                    <input
                      type='text'
                      value={row.path}
                      onChange={(e) => onPatch(idx, { path: e.target.value })}
                      onBlur={() => {
                        const raw = entries[idx]?.path ?? ""
                        const n = normalizeBookTocPath(raw)
                        if (n) onPatch(idx, { path: n })
                      }}
                      disabled={disabled}
                      className='form-control w-full min-w-0 font-mono text-sm'
                      placeholder='예: 1.2'
                      inputMode='decimal'
                      aria-label='목차 경로 수정'
                    />
                    <input
                      type='text'
                      value={row.title}
                      onChange={(e) => onPatch(idx, { title: e.target.value })}
                      disabled={disabled}
                      className='form-control w-full min-w-0'
                      placeholder='제목'
                    />
                  </div>
                  <button
                    type='button'
                    disabled={disabled}
                    onClick={() => removeAt(idx)}
                    className='shrink-0 self-end rounded-lg p-2 text-theme-tertiary hover:bg-red-500/12 hover:text-red-600 sm:self-center'
                    aria-label='이 행 삭제'
                  >
                    <Trash2 className='h-4 w-4' />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {!hasTree ? (
        <div className='py-6 text-center'>
          <p className='mb-1 text-sm font-medium text-theme-primary'>
            아직 목차가 없습니다
          </p>
          <p className='mb-5 text-xs leading-relaxed text-theme-secondary'>
            숫자 경로 <span className='font-mono'>1 → 1.1 → 1.1.1 → 1.1.1.1</span>처럼
            최대 네 단계까지 이어집니다.
          </p>
          <button
            type='button'
            disabled={disabled}
            onClick={addRoot}
            className='inline-flex items-center gap-2 rounded-xl bg-accent-theme px-5 py-3 text-sm font-medium text-white hover:bg-accent-theme-secondary disabled:opacity-50'
          >
            <Plus className='h-4 w-4' />
            첫 번째 목차 추가
          </button>
        </div>
      ) : (
        <>
          <div className='divide-y divide-theme-tertiary/40'>
            {flatRows.map(({ node, depth }) => (
              <TocRowBlock
                key={node.path}
                node={node}
                depth={depth}
                entries={entries}
                expandedPaths={expandedPaths}
                onToggleExpand={toggleExpand}
                onPatch={onPatch}
                onRemoveBranch={onRemoveBranch}
                onAddChild={onAddChild}
                onAddSibling={onAddSibling}
                disabled={disabled}
              />
            ))}
          </div>

          <button
            type='button'
            disabled={disabled}
            onClick={addRoot}
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-theme-tertiary py-3.5 text-sm font-medium text-accent-theme transition-colors hover:border-accent-theme/50 hover:bg-accent-theme/8 disabled:opacity-50'
          >
            <Plus className='h-4 w-4' />
            최상위 항목 추가
            <span className='font-mono text-xs text-theme-tertiary'>
              (다음 {nextRootPath(entries)})
            </span>
          </button>
        </>
      )}
    </div>
  )
}
