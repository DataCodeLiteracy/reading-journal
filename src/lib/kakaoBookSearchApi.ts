import type { BookSearchHit } from "@/types/bookLookup"
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities"
import { formatBookAuthors } from "@/utils/formatBookAuthors"
import { pickBookDescription } from "@/utils/pickBookDescription"
import { stripHtmlTags } from "@/utils/stripHtmlTags"

const KAKAO_BOOK_SEARCH_URL = "https://dapi.kakao.com/v3/search/book"

type KakaoBookDocument = {
  title?: string
  contents?: string
  url?: string
  isbn?: string
  datetime?: string
  authors?: string[]
  publisher?: string
  translators?: string[]
  price?: number
  sale_price?: number
  thumbnail?: string
  status?: string
}

type KakaoBookSearchResponse = {
  meta?: {
    total_count?: number
    pageable_count?: number
    is_end?: boolean
  }
  documents?: KakaoBookDocument[]
}

function getRestApiKey(): string {
  const key = process.env.KAKAO_REST_API_KEY?.trim()
  if (!key) {
    throw new Error("KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.")
  }
  return key
}

function str(v: unknown): string {
  if (v == null) return ""
  return String(v).trim()
}

function parseIsbn13(isbn: string): string | undefined {
  const parts = isbn.trim().split(/\s+/).filter(Boolean)
  for (const part of parts) {
    const digits = part.replace(/[^0-9]/g, "")
    if (digits.length === 13) return digits
  }
  const all = isbn.replace(/[^0-9]/g, "")
  if (all.length >= 13) return all.slice(-13)
  return undefined
}

function formatPublishedDate(datetime: string): string | undefined {
  const t = datetime.trim()
  if (!t) return undefined
  const datePart = t.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
  return undefined
}

function mapDocumentToSearchHit(doc: KakaoBookDocument): BookSearchHit | null {
  const title = stripHtmlTags(str(doc.title))
  if (!title) return null

  const description = str(doc.contents)
  const authors = doc.authors ?? []

  return {
    title,
    author: formatBookAuthors(authors),
    publisher: str(doc.publisher) || undefined,
    publishedDate: doc.datetime
      ? formatPublishedDate(doc.datetime)
      : undefined,
    coverUrl: str(doc.thumbnail) || undefined,
    isbn13: doc.isbn ? parseIsbn13(doc.isbn) : undefined,
    description: description
      ? pickBookDescription(decodeHtmlEntities(description))
      : undefined,
  }
}

export async function kakaoSearchBooksByTitle(
  query: string,
  size = 25,
): Promise<BookSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  const url = new URL(KAKAO_BOOK_SEARCH_URL)
  url.searchParams.set("query", q)
  url.searchParams.set("size", String(Math.min(Math.max(size, 1), 50)))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `KakaoAK ${getRestApiKey()}`,
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`카카오 도서 검색 API 오류 (${res.status})`)
  }

  const data = (await res.json()) as KakaoBookSearchResponse
  return (data.documents ?? [])
    .map(mapDocumentToSearchHit)
    .filter((hit): hit is BookSearchHit => hit !== null)
}
