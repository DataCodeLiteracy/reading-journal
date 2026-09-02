import type { BookLookupMetadata } from "@/types/bookLookup"
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities"
import { formatBookAuthors } from "@/utils/formatBookAuthors"

export type BookLookupFormFieldSnapshot = {
  title: string
  author: string
  publisher: string
  publishedDate: string
  coverUrl: string
  isbn13: string
  kdcMajorCode: string
  kdcMajorLabel: string
  kdcMiddleCode: string
  kdcMiddleLabel: string
  kdcDetailCode: string
  subjects: string[]
  notes: string
}

export function buildExpectedFormAfterBookLookup(
  metadata: BookLookupMetadata,
  currentNotes: string,
): Partial<BookLookupFormFieldSnapshot> {
  const expected: Partial<BookLookupFormFieldSnapshot> = {}

  if (metadata.title.trim()) {
    expected.title = metadata.title.trim()
  }
  const author = formatBookAuthors(metadata.author)
  if (author) expected.author = author
  if (metadata.publisher) expected.publisher = metadata.publisher
  if (metadata.publishedDate) expected.publishedDate = metadata.publishedDate
  if (metadata.coverUrl) expected.coverUrl = metadata.coverUrl
  if (metadata.isbn13) expected.isbn13 = metadata.isbn13
  if (metadata.kdcMajorCode) expected.kdcMajorCode = metadata.kdcMajorCode
  if (metadata.kdcMajorLabel) expected.kdcMajorLabel = metadata.kdcMajorLabel
  if (metadata.kdcMiddleCode) expected.kdcMiddleCode = metadata.kdcMiddleCode
  if (metadata.kdcMiddleLabel) expected.kdcMiddleLabel = metadata.kdcMiddleLabel
  if (metadata.kdcDetailCode) expected.kdcDetailCode = metadata.kdcDetailCode
  if (metadata.subjects?.length) expected.subjects = metadata.subjects
  if (metadata.description && !currentNotes.trim()) {
    expected.notes = decodeHtmlEntities(metadata.description)
  }

  return expected
}

export function formMatchesBookLookupExpectations(
  form: BookLookupFormFieldSnapshot,
  expected: Partial<BookLookupFormFieldSnapshot>,
): boolean {
  for (const key of Object.keys(expected) as (keyof BookLookupFormFieldSnapshot)[]) {
    const expectedValue = expected[key]
    const formValue = form[key]
    if (key === "subjects" && Array.isArray(expectedValue)) {
      const a = expectedValue as string[]
      const b = formValue as string[]
      if (a.length !== b.length || a.some((v, i) => v !== b[i])) return false
      continue
    }
    if (formValue !== expectedValue) return false
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
