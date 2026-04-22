import type { BookTocEntry } from "@/types/bookToc"
import { BOOK_TOC_MAX_DEPTH } from "@/types/bookToc"
import {
  normalizeBookTocPath,
  normalizeBookTocStartPage,
  sortBookTocEntries,
} from "./bookToc"

export type TocTreeNode = {
  path: string
  entryIndex: number
  children: TocTreeNode[]
}

export function getParentPath(normalizedPath: string): string {
  const parts = normalizedPath.split(".")
  if (parts.length <= 1) return ""
  return parts.slice(0, -1).join(".")
}

export function pathDepth(normalizedPath: string): number {
  return normalizedPath.split(".").length
}

function hasAllAncestorsInSet(norm: string, pathSet: Set<string>): boolean {
  const parts = norm.split(".")
  for (let i = 1; i < parts.length; i++) {
    const pref = parts.slice(0, i).join(".")
    if (!pathSet.has(pref)) return false
  }
  return true
}

function compareNormalizedPath(a: string, b: string): number {
  const pa = a.split(".").map((s) => parseInt(s, 10))
  const pb = b.split(".").map((s) => parseInt(s, 10))
  const n = Math.max(pa.length, pb.length)
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) return da - db
  }
  return 0
}

function pathSetFrom(entries: BookTocEntry[]): Set<string> {
  return new Set(
    entries
      .map((e) => normalizeBookTocPath(e.path))
      .filter((p): p is string => p !== null),
  )
}

/** 상위가 없거나 경로 형식이 잘못된 행의 인덱스 */
export function getOrphanIndices(entries: BookTocEntry[]): number[] {
  const set = pathSetFrom(entries)
  return entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => {
      const p = normalizeBookTocPath(e.path)
      if (!p) {
        return Boolean(e.path.trim() || e.title.trim())
      }
      return !hasAllAncestorsInSet(p, set)
    })
    .map(({ i }) => i)
}

/**
 * 계층이 맞는 항목만 트리로 묶습니다. `entryIndex`는 항상 원본 `entries` 배열 인덱스입니다.
 */
export function buildTocTreeFromEntries(entries: BookTocEntry[]): {
  roots: TocTreeNode[]
  orphanIndices: number[]
} {
  const orphanSet = new Set(getOrphanIndices(entries))
  const items: { entryIndex: number; path: string }[] = []
  for (let i = 0; i < entries.length; i++) {
    if (orphanSet.has(i)) continue
    const p = normalizeBookTocPath(entries[i]!.path)
    if (!p) continue
    items.push({ entryIndex: i, path: p })
  }
  items.sort((a, b) => compareNormalizedPath(a.path, b.path))

  const map = new Map<string, TocTreeNode>()
  for (const { entryIndex, path } of items) {
    map.set(path, { path, entryIndex, children: [] })
  }
  const roots: TocTreeNode[] = []
  for (const { path } of items) {
    const node = map.get(path)!
    const par = getParentPath(path)
    if (par === "") {
      roots.push(node)
    } else {
      map.get(par)?.children.push(node)
    }
  }
  for (const n of map.values()) {
    n.children.sort((a, b) => compareNormalizedPath(a.path, b.path))
  }
  roots.sort((a, b) => compareNormalizedPath(a.path, b.path))

  return { roots, orphanIndices: [...orphanSet].sort((a, b) => a - b) }
}

export function nextRootPath(entries: BookTocEntry[]): string {
  let max = 0
  for (const e of entries) {
    const p = normalizeBookTocPath(e.path)
    if (!p) continue
    const parts = p.split(".")
    if (parts.length === 1) {
      const n = parseInt(parts[0]!, 10)
      if (Number.isFinite(n)) max = Math.max(max, n)
    }
  }
  return String(max + 1 || 1)
}

export function nextChildPath(
  entries: BookTocEntry[],
  parentNormalized: string,
): string | null {
  const parentDepth =
    parentNormalized === "" ? 0 : pathDepth(parentNormalized)
  if (parentDepth >= BOOK_TOC_MAX_DEPTH) return null

  const prefix = parentNormalized === "" ? "" : `${parentNormalized}.`
  const childDepth = parentDepth + 1
  let max = 0
  for (const e of entries) {
    const p = normalizeBookTocPath(e.path)
    if (!p) continue
    if (pathDepth(p) !== childDepth) continue
    if (parentNormalized === "") {
      if (p.includes(".")) continue
    } else if (!p.startsWith(`${parentNormalized}.`)) continue

    const last = parseInt(p.split(".").pop()!, 10)
    if (Number.isFinite(last)) max = Math.max(max, last)
  }
  return `${prefix}${max + 1}`
}

export function removeEntryAndDescendants(
  entries: BookTocEntry[],
  targetNormalized: string,
): BookTocEntry[] {
  return entries.filter((e) => {
    const p = normalizeBookTocPath(e.path)
    if (!p) return true
    if (p === targetNormalized) return false
    if (p.startsWith(`${targetNormalized}.`)) return false
    return true
  })
}

export function validateTocForSave(entries: BookTocEntry[]): string | null {
  const seen = new Set<string>()
  for (const e of entries) {
    const title = e.title.trim()
    const p = normalizeBookTocPath(e.path)
    if (!title && !p && !e.path.trim()) continue
    if (!p) {
      return `목차 경로를 올바른 형식으로 입력해 주세요. (예: 1, 1.2, 1.2.3, 1.2.3.4) — 문제: "${e.path.trim() || "(비어 있음)"}"`
    }
    if (!title) {
      return `「${p}」제목을 입력해 주세요.`
    }
    if (
      e.startPage !== undefined &&
      e.startPage !== null &&
      String(e.startPage).trim() !== "" &&
      normalizeBookTocStartPage(e.startPage) === undefined
    ) {
      return `「${p}」시작 쪽 번호는 1 이상의 정수만 입력할 수 있습니다.`
    }
    if (seen.has(p)) return `경로「${p}」가 중복되었습니다.`
    seen.add(p)
  }

  for (const p of seen) {
    if (!hasAllAncestorsInSet(p, seen)) {
      const par = getParentPath(p)
      return `「${p}」을(를) 저장하려면 상위 목차「${par}」가 먼저 있어야 합니다.`
    }
  }
  return null
}

export function entriesForPersist(entries: BookTocEntry[]): BookTocEntry[] {
  const cleaned: BookTocEntry[] = []
  for (const e of entries) {
    const p = normalizeBookTocPath(e.path)
    const title = e.title.trim()
    if (!p || !title) continue
    const sp = normalizeBookTocStartPage(e.startPage)
    cleaned.push({
      path: p,
      title,
      ...(sp !== undefined ? { startPage: sp } : {}),
    })
  }
  return sortBookTocEntries(cleaned)
}
