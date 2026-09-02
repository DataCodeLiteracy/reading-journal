/** 외부 도서 검색 API 공통 DTO */
export type BookSearchHit = {
  title: string
  author: string
  publisher?: string
  publishedDate?: string
  coverUrl?: string
  isbn13?: string
  description?: string
}

/** 검색 결과 → 폼 자동 채움용 */
export type BookLookupMetadata = BookSearchHit & {
  kdcMajorCode?: string
  kdcMajorLabel?: string
  kdcMiddleCode?: string
  kdcMiddleLabel?: string
  kdcDetailCode?: string
  subjects?: string[]
}
