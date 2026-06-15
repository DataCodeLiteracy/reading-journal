import type { AladinBookMetadata } from "@/types/aladin"
import { parseAladinAuthor } from "@/utils/parseAladinAuthor"
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities"

export type AladinBookFormSetters = {
  setTitle: (v: string) => void
  setAuthor: (v: string) => void
  setPublisher: (v: string) => void
  setPublishedDate: (v: string) => void
  setCategoryDepth1Id: (v: string) => void
  setCategoryDepth2Id: (v: string) => void
  /** 대·중분류를 한 React 렌더 사이클에 반영 (있으면 우선) */
  setCategories?: (depth1Id: string, depth2Id: string) => void
  setCoverUrl: (v: string) => void
  setIsbn13: (v: string) => void
  setNotes?: (v: string) => void
  getNotes?: () => string
}

/** 알라딘 메타데이터를 등록/수정 폼 상태에 반영 */
export function applyAladinBookMetadata(
  metadata: AladinBookMetadata,
  setters: AladinBookFormSetters,
): void {
  if (metadata.title.trim()) setters.setTitle(metadata.title.trim())
  const author = parseAladinAuthor(metadata.author)
  if (author) setters.setAuthor(author)
  if (metadata.publisher) setters.setPublisher(metadata.publisher)
  if (metadata.publishedDate) setters.setPublishedDate(metadata.publishedDate)
  if (metadata.coverUrl) setters.setCoverUrl(metadata.coverUrl)
  if (metadata.isbn13) setters.setIsbn13(metadata.isbn13)
  if (
    metadata.description &&
    setters.setNotes &&
    setters.getNotes &&
    !setters.getNotes().trim()
  ) {
    setters.setNotes(decodeHtmlEntities(metadata.description))
  }

  const d1 = metadata.categoryDepth1Id?.trim() ?? ""
  const d2 = metadata.categoryDepth2Id?.trim() ?? ""

  if (d1 && d2) {
    if (setters.setCategories) {
      setters.setCategories(d1, d2)
    } else {
      setters.setCategoryDepth1Id(d1)
      setters.setCategoryDepth2Id(d2)
    }
    return
  }

  if (d1) setters.setCategoryDepth1Id(d1)
  if (d2) setters.setCategoryDepth2Id(d2)
}
