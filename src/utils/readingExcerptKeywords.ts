import type { ReadingExcerptChapterJson } from "@/types/readingContent"

/** 발췌 키워드를 해시태그 형태로 표시 */
export function keywordToHashtag(raw: string): string {
  const t = raw.trim()
  if (!t) return ""
  return t.startsWith("#") ? t : `#${t}`
}

export type ExcerptChapterKeywordBlock = {
  /** 원본 JSON 배열 기준 0부터 */
  chapterIndex: number
  chapterTitle: string
  keywords: string[]
}

export type KeywordWithChapter = {
  keyword: string
  chapterIndex: number
}

/** 챕터마다 키워드 목록(챕터 내 중복 제거·가나다순). 키워드가 없는 챕터는 제외 */
export function collectExcerptKeywordsByChapter(
  chapters: ReadingExcerptChapterJson[] | undefined,
): ExcerptChapterKeywordBlock[] {
  if (!chapters?.length) return []
  return chapters
    .map((ch, chapterIndex) => {
      const seen = new Set<string>()
      const keywords: string[] = []
      for (const k of ch.key_keywords ?? []) {
        const t = k.trim()
        if (!t || seen.has(t)) continue
        seen.add(t)
        keywords.push(t)
      }
      keywords.sort((a, b) => a.localeCompare(b, "ko"))
      const chapterTitle =
        (ch.title ?? "").trim() || `챕터 ${chapterIndex + 1}`
      return { chapterIndex, chapterTitle, keywords }
    })
    .filter((b) => b.keywords.length > 0)
}

/** 챕터 순서대로 키워드를 모아 미리보기용으로 최대 `max`개(챕터 내 중복만 제거) */
export function collectExcerptKeywordsForPreview(
  chapters: ReadingExcerptChapterJson[] | undefined,
  max: number,
): KeywordWithChapter[] {
  const out: KeywordWithChapter[] = []
  for (let chapterIndex = 0; chapterIndex < (chapters?.length ?? 0); chapterIndex++) {
    const ch = chapters![chapterIndex]!
    const seenInChapter = new Set<string>()
    for (const k of ch.key_keywords ?? []) {
      const t = k.trim()
      if (!t || seenInChapter.has(t)) continue
      seenInChapter.add(t)
      if (out.length >= max) return out
      out.push({ keyword: t, chapterIndex })
    }
  }
  return out
}

/** 전체 발췌에서 표시되는 키워드 개수(챕터마다 한 번씩만 센 고유 키워드 수의 합) */
export function countExcerptKeywordSlots(
  chapters: ReadingExcerptChapterJson[] | undefined,
): number {
  return collectExcerptKeywordsByChapter(chapters).reduce(
    (n, b) => n + b.keywords.length,
    0,
  )
}

/** 챕터별 key_keywords 를 모아 전역 중복 제거·가나다순 정렬 */
export function collectExcerptKeywordsSorted(
  chapters: ReadingExcerptChapterJson[] | undefined,
): string[] {
  const s = new Set<string>()
  for (const ch of chapters ?? []) {
    for (const k of ch.key_keywords ?? []) {
      const t = k.trim()
      if (t) s.add(t)
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, "ko"))
}
