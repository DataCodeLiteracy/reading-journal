import type { AladinBookMetadata } from "@/types/aladin"
import type { BookCategoryTree } from "@/types/bookCategory"
import { BookCategoryService } from "@/services/bookCategoryService"
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities"
import { parseAladinAuthor } from "@/utils/parseAladinAuthor"

export type AladinFormFieldSnapshot = {
  title: string
  author: string
  publisher: string
  publishedDate: string
  categoryDepth1Id: string
  categoryDepth2Id: string
  coverUrl: string
  isbn13: string
  notes: string
}

/** applyAladinBookMetadata(enriched) 직후 폼에 기대되는 값 */
export function buildExpectedFormAfterAladin(
  metadata: AladinBookMetadata,
  enriched: AladinBookMetadata,
  currentNotes: string,
  categoryTree: BookCategoryTree | undefined,
): Partial<AladinFormFieldSnapshot> {
  const expected: Partial<AladinFormFieldSnapshot> = {}

  if (metadata.title.trim()) {
    expected.title = metadata.title.trim()
  }
  const author = parseAladinAuthor(metadata.author)
  if (author) expected.author = author
  if (metadata.publisher) expected.publisher = metadata.publisher
  if (metadata.publishedDate) expected.publishedDate = metadata.publishedDate
  if (metadata.coverUrl) expected.coverUrl = metadata.coverUrl
  if (metadata.isbn13) expected.isbn13 = metadata.isbn13
  if (
    metadata.description &&
    !currentNotes.trim()
  ) {
    expected.notes = decodeHtmlEntities(metadata.description)
  }

  const d1 = enriched.categoryDepth1Id?.trim() ?? ""
  const d2 = enriched.categoryDepth2Id?.trim() ?? ""
  if (d1) expected.categoryDepth1Id = d1
  if (d2) expected.categoryDepth2Id = d2

  if (
    expected.categoryDepth2Id &&
    !expected.categoryDepth1Id &&
    categoryTree
  ) {
    const depth2 = BookCategoryService.findDepth2(
      categoryTree,
      expected.categoryDepth2Id,
    )
    if (depth2) expected.categoryDepth1Id = depth2.parentId
  }

  return expected
}

export function formMatchesAladinExpectations(
  form: AladinFormFieldSnapshot,
  expected: Partial<AladinFormFieldSnapshot>,
): boolean {
  for (const key of Object.keys(expected) as (keyof AladinFormFieldSnapshot)[]) {
    if (form[key] !== expected[key]) return false
  }
  return true
}

export async function waitUntil(
  predicate: () => boolean,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<boolean> {
  const intervalMs = options?.intervalMs ?? 16
  const timeoutMs = options?.timeoutMs ?? 8000
  if (predicate()) return true

  return new Promise((resolve) => {
    const started = Date.now()
    const id = window.setInterval(() => {
      if (predicate()) {
        window.clearInterval(id)
        resolve(true)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(id)
        resolve(false)
      }
    }, intervalMs)
  })
}
