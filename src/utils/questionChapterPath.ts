import type { BookTocEntry } from "@/types/bookToc"
import { normalizeBookTocPath, sortBookTocEntries } from "@/utils/bookToc"

/** 카드·폼 표시용 */
export function chapterPathToDisplayText(chapterPath: string[] | undefined): string {
  if (!chapterPath?.length) return ""
  if (chapterPath.length === 1 && chapterPath[0] === "전체") return ""
  return chapterPath.join(" › ")
}

/** 메모용 — 목차 번호(path)를 앞에 붙여 표시 */
export function memoTocDisplayText(
  tocPath: string | undefined,
  chapterPath: string[] | undefined,
): string {
  const path = tocPath?.trim() ?? ""
  const titles = chapterPathToDisplayText(chapterPath)
  if (path && titles) return `${path} · ${titles}`
  if (path) return path
  return titles
}

/** 저장용 — 빈 입력은 「전체」 */
export function displayTextToChapterPath(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return ["전체"]
  if (trimmed === "전체") return ["전체"]
  const parts = trimmed
    .split(/\s*[›/]\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length ? parts : [trimmed]
}

/** 등록된 목차 path → 표시·저장용 title 경로 */
export function buildChapterPathFromTocPath(
  entries: BookTocEntry[],
  normalizedPath: string,
): string[] {
  const sorted = sortBookTocEntries(entries)
  const parts = normalizedPath.split(".")
  const labels: string[] = []
  for (let i = 1; i <= parts.length; i++) {
    const p = parts.slice(0, i).join(".")
    const entry = sorted.find((e) => normalizeBookTocPath(e.path) === p)
    if (entry?.title.trim()) labels.push(entry.title.trim())
  }
  return labels.length ? labels : [normalizedPath]
}

export type TocPickerOption = {
  value: string
  label: string
  chapterPath: string[]
}

type TocPickerOptionsOpts = {
  /** true면 라벨에 `1.1 제목`처럼 path 번호 포함 */
  showPath?: boolean
}

/** 목차 선택 드롭다운 옵션 (depth 들여쓰기) */
export function buildTocPickerOptions(
  entries: BookTocEntry[],
  opts?: TocPickerOptionsOpts,
): TocPickerOption[] {
  const sorted = sortBookTocEntries(entries).filter(
    (e) => normalizeBookTocPath(e.path) && e.title.trim(),
  )
  return sorted.map((entry) => {
    const norm = normalizeBookTocPath(entry.path)!
    const depth = norm.split(".").length
    const indent = depth > 1 ? "\u3000".repeat(depth - 1) : ""
    const title = entry.title.trim()
    return {
      value: norm,
      label: opts?.showPath ? `${indent}${norm} ${title}` : `${indent}${title}`,
      chapterPath: buildChapterPathFromTocPath(sorted, norm),
    }
  })
}
