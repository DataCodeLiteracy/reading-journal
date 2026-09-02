import { kakaoSearchBooksByTitle } from "@/lib/kakaoBookSearchApi"
import {
  enrichBookLookupFromNlk,
  indexNlkCollectionByIsbn,
  isNlkConfigured,
  mapNlkCollectionToMetadata,
  nlkSearchCollectionByKeyword,
  type NlkEnrichment,
} from "@/lib/nlkOpenApi"
import type { BookLookupMetadata } from "@/types/bookLookup"
import { pickBookDescription } from "@/utils/pickBookDescription"
import { normalizeBookLookupKdc } from "@/utils/normalizeBookLookupKdc"

export function mergeBookLookupMetadata(
  base: BookLookupMetadata,
  extra: Partial<BookLookupMetadata> & NlkEnrichment,
): BookLookupMetadata {
  const subjects = [
    ...new Set([...(base.subjects ?? []), ...(extra.subjects ?? [])]),
  ]

  return normalizeBookLookupKdc({
    ...base,
    ...extra,
    title: base.title || extra.title || "",
    author: base.author || extra.author || "",
    publisher: base.publisher || extra.publisher,
    publishedDate: base.publishedDate || extra.publishedDate,
    coverUrl: extra.coverUrl || base.coverUrl,
    isbn13: base.isbn13 || extra.isbn13,
    description: pickBookDescription(base.description),
    kdcMajorCode: extra.kdcMajorCode || base.kdcMajorCode,
    kdcMajorLabel: extra.kdcMajorLabel || base.kdcMajorLabel,
    kdcMiddleCode: extra.kdcMiddleCode || base.kdcMiddleCode,
    kdcMiddleLabel: extra.kdcMiddleLabel || base.kdcMiddleLabel,
    kdcDetailCode: extra.kdcDetailCode || base.kdcDetailCode,
    subjects: subjects.length ? subjects : undefined,
  })
}

/** 카카오 + 국립중앙도서관 소장자료를 병렬 검색해 후보 목록 반환 */
export async function searchBooksUnified(
  query: string,
  maxResults = 25,
): Promise<BookLookupMetadata[]> {
  const q = query.trim()
  if (!q) return []

  const size = Math.min(Math.max(maxResults, 1), 50)

  const [kakaoHits, nlkHits] = await Promise.all([
    kakaoSearchBooksByTitle(q, size).catch((e) => {
      console.warn("book lookup kakao:", e)
      return []
    }),
    isNlkConfigured()
      ? nlkSearchCollectionByKeyword(q, size).catch((e) => {
          console.warn("book lookup nlk:", e)
          return []
        })
      : Promise.resolve([]),
  ])

  const nlkByIsbn = indexNlkCollectionByIsbn(nlkHits)

  const mergedFromKakao = kakaoHits.map((hit) => {
    const isbnKey = hit.isbn13?.replace(/[^0-9]/g, "")
    const nlkItem = isbnKey ? nlkByIsbn.get(isbnKey) : undefined
    const nlkMeta = nlkItem ? mapNlkCollectionToMetadata(nlkItem) : {}
    return mergeBookLookupMetadata(hit, nlkMeta)
  })

  if (mergedFromKakao.length > 0) {
    return mergedFromKakao
  }

  return nlkHits
    .map((item) => mapNlkCollectionToMetadata(item))
    .filter((hit) => hit.title.trim().length > 0)
}

/** ISBN 서지 등으로 메타데이터를 최종 보강 */
export async function resolveBookMetadata(
  hit: BookLookupMetadata,
): Promise<BookLookupMetadata> {
  const enrichment = await enrichBookLookupFromNlk(hit)
  return mergeBookLookupMetadata(hit, enrichment)
}
