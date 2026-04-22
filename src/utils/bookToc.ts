import type { BookTocEntry } from "@/types/bookToc"
import { BOOK_TOC_MAX_DEPTH } from "@/types/bookToc"

/**
 * 세그먼트별 trim 후 `1` · `1.2.3` 형태로 합칩니다.
 * `1    `, `1  .  2` 등 공백만 정리합니다(앞뒤 0으로만 이루어진 세그먼트는 숫자로 정규화).
 */
export function normalizeBookTocPath(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const parts = s
    .split(".")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (parts.length < 1 || parts.length > BOOK_TOC_MAX_DEPTH) return null
  const out: string[] = []
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null
    const n = parseInt(p, 10)
    if (n < 1 || n > 999_999) return null
    out.push(String(n))
  }
  return out.join(".")
}

/** `1`, `1.2`, `1.2.3`, `1.2.3.4` 만 허용 */
export function isValidBookTocPath(path: string): boolean {
  return normalizeBookTocPath(path) !== null
}

export function normalizeBookTocStartPage(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.floor(n)
}

function pathSegments(path: string): number[] {
  const n = normalizeBookTocPath(path)
  if (!n) return [Number.POSITIVE_INFINITY]
  return n.split(".").map((s) => parseInt(s, 10))
}

/** 숫자 경로 기준 정렬 (트리 순회와 유사). 잘못된 경로는 맨 뒤로 갑니다. */
export function sortBookTocEntries(entries: BookTocEntry[]): BookTocEntry[] {
  return [...entries].sort((a, b) => {
    const pa = pathSegments(a.path)
    const pb = pathSegments(b.path)
    const n = Math.max(pa.length, pb.length)
    for (let i = 0; i < n; i++) {
      const da = pa[i] ?? 0
      const db = pb[i] ?? 0
      if (da !== db) return da - db
    }
    return 0
  })
}

/** 복사·외부 연동용 canonical JSON */
export function bookTocOutlineToCanonicalJson(entries: BookTocEntry[]): string {
  const rows = entries
    .map((e) => {
      const p = normalizeBookTocPath(e.path)
      if (!p || !e.title.trim()) return null
      const row: Record<string, unknown> = { path: p, title: e.title.trim() }
      const sp = normalizeBookTocStartPage(e.startPage)
      if (sp !== undefined) row.startPage = sp
      return row
    })
    .filter(Boolean) as Record<string, unknown>[]
  const sorted = [...rows].sort((a, b) => {
    const pa = (a.path as string).split(".").map(Number)
    const pb = (b.path as string).split(".").map(Number)
    const n = Math.max(pa.length, pb.length)
    for (let i = 0; i < n; i++) {
      const da = pa[i] ?? 0
      const db = pb[i] ?? 0
      if (da !== db) return da - db
    }
    return 0
  })
  return JSON.stringify({ version: 2, entries: sorted }, null, 2)
}
