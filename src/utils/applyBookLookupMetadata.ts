import type { BookLookupMetadata } from "@/types/bookLookup"
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities"
import { formatBookAuthors } from "@/utils/formatBookAuthors"

export type BookLookupFormSetters = {
  setTitle: (v: string) => void
  setAuthor: (v: string) => void
  setPublisher: (v: string) => void
  setPublishedDate: (v: string) => void
  setCoverUrl: (v: string) => void
  setIsbn13: (v: string) => void
  setKdcMajorCode?: (v: string) => void
  setKdcMajorLabel?: (v: string) => void
  setKdcMiddleCode?: (v: string) => void
  setKdcMiddleLabel?: (v: string) => void
  setKdcDetailCode?: (v: string) => void
  setSubjects?: (v: string[]) => void
  setNotes?: (v: string) => void
  getNotes?: () => string
}

/** 외부 도서 검색 메타데이터를 등록/수정 폼 상태에 반영 */
export function applyBookLookupMetadata(
  metadata: BookLookupMetadata,
  setters: BookLookupFormSetters,
): void {
  if (metadata.title.trim()) setters.setTitle(metadata.title.trim())
  const author = formatBookAuthors(metadata.author)
  if (author) setters.setAuthor(author)
  if (metadata.publisher) setters.setPublisher(metadata.publisher)
  if (metadata.publishedDate) setters.setPublishedDate(metadata.publishedDate)
  if (metadata.coverUrl) setters.setCoverUrl(metadata.coverUrl)
  if (metadata.isbn13) setters.setIsbn13(metadata.isbn13)
  if (metadata.kdcMajorCode && setters.setKdcMajorCode) {
    setters.setKdcMajorCode(metadata.kdcMajorCode)
  }
  if (metadata.kdcMajorLabel && setters.setKdcMajorLabel) {
    setters.setKdcMajorLabel(metadata.kdcMajorLabel)
  }
  if (metadata.kdcMiddleCode && setters.setKdcMiddleCode) {
    setters.setKdcMiddleCode(metadata.kdcMiddleCode)
  }
  if (metadata.kdcMiddleLabel && setters.setKdcMiddleLabel) {
    setters.setKdcMiddleLabel(metadata.kdcMiddleLabel)
  }
  if (metadata.kdcDetailCode && setters.setKdcDetailCode) {
    setters.setKdcDetailCode(metadata.kdcDetailCode)
  }
  if (metadata.subjects?.length && setters.setSubjects) {
    setters.setSubjects(metadata.subjects)
  }
  if (
    metadata.description &&
    setters.setNotes &&
    setters.getNotes &&
    !setters.getNotes().trim()
  ) {
    setters.setNotes(decodeHtmlEntities(metadata.description))
  }
}
