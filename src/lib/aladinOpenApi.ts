import type { AladinBookMetadata, AladinSearchHit } from "@/types/aladin"
import { parseAladinAuthor } from "@/utils/parseAladinAuthor"
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities"
import { loadBookCategoryTreeServer } from "@/lib/loadBookCategorySeedServer"
import {
  extractAladinCategoryInfos,
  extractCategoryIdListFromItem,
  mapAladinCategoryIdList,
} from "@/lib/aladinCategoryMapping"

const ALADIN_API_BASE = "https://www.aladin.co.kr/ttb/api"
const API_VERSION = "20131101"
const COVER_SIZE = "MidBig"

function getTtbKey(): string {
  const key = process.env.ALADIN_TTB_KEY?.trim()
  if (!key) {
    throw new Error("ALADIN_TTB_KEY 환경변수가 설정되지 않았습니다.")
  }
  return key
}

function parseAladinJson(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as Record<string, unknown>
  }
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
  }
  throw new Error("알라딘 API 응답을 파싱할 수 없습니다.")
}

function normalizeItems(data: Record<string, unknown>): Record<string, unknown>[] {
  const item = data.item
  if (!item) return []
  return Array.isArray(item) ? (item as Record<string, unknown>[]) : [item as Record<string, unknown>]
}

function str(v: unknown): string {
  if (v == null) return ""
  return String(v).trim()
}

function formatPubDate(pubDate: string): string {
  const t = pubDate.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  if (/^\d{8}$/.test(t)) {
    return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`
  }
  return t
}

function mapItemToSearchHit(item: Record<string, unknown>): AladinSearchHit {
  const isbn13 = str(item.isbn13) || undefined
  const pub = str(item.pubDate ?? item.pubdate)
  const description = str(item.description)
  return {
    title: str(item.title),
    author: parseAladinAuthor(str(item.author)),
    publisher: str(item.publisher) || undefined,
    publishedDate: pub ? formatPubDate(pub) : undefined,
    coverUrl: str(item.cover) || undefined,
    isbn13,
    description: description
      ? decodeHtmlEntities(description).slice(0, 500)
      : undefined,
  }
}

async function fetchAladin(
  endpoint: "ItemSearch.aspx" | "ItemLookUp.aspx",
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${ALADIN_API_BASE}/${endpoint}`)
  url.searchParams.set("ttbkey", getTtbKey())
  url.searchParams.set("output", "js")
  url.searchParams.set("Version", API_VERSION)
  url.searchParams.set("Cover", COVER_SIZE)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 0 },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`알라딘 API 오류 (${res.status})`)
  }

  const data = parseAladinJson(text)
  const errCode = data.errorCode
  if (errCode != null && Number(errCode) !== 0) {
    throw new Error(
      str(data.errorMessage) || `알라딘 API 오류 (code ${errCode})`,
    )
  }
  return data
}

export async function aladinSearchByTitle(
  query: string,
  maxResults = 25,
): Promise<AladinSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  const data = await fetchAladin("ItemSearch.aspx", {
    Query: q,
    // 홈페이지 통합검색과 비슷하게 제목·저자·출판사 등 키워드로 검색
    QueryType: "Keyword",
    SearchTarget: "Book",
    MaxResults: String(Math.min(Math.max(maxResults, 1), 50)),
    Start: "1",
    outofStockfilter: "0",
  })

  return normalizeItems(data)
    .map(mapItemToSearchHit)
    .filter((h) => h.title.length > 0)
}

export async function aladinLookupByIsbn13(
  isbn13: string,
): Promise<AladinBookMetadata | null> {
  const id = isbn13.trim().replace(/[^0-9]/g, "")
  if (id.length < 10) return null

  const data = await fetchAladin("ItemLookUp.aspx", {
    ItemId: id,
    ItemIdType: "ISBN13",
    OptResult: "categoryIdList",
  })

  const items = normalizeItems(data)
  if (items.length === 0) return null

  const item = items[0]
  const base = mapItemToSearchHit(item)
  const categoryIdListRaw = extractCategoryIdListFromItem(item)
  const aladinCategoryInfos = extractAladinCategoryInfos(categoryIdListRaw)

  const tree = await loadBookCategoryTreeServer()
  const mapped = mapAladinCategoryIdList(categoryIdListRaw, tree)

  return {
    ...base,
    aladinCategoryInfos,
    ...(mapped ?? {}),
  }
}

export async function aladinResolveBookMetadata(
  hit: AladinSearchHit,
): Promise<AladinBookMetadata> {
  if (hit.isbn13) {
    const detailed = await aladinLookupByIsbn13(hit.isbn13)
    if (detailed) {
      return {
        ...hit,
        ...detailed,
        title: detailed.title || hit.title,
        author: detailed.author || hit.author,
      }
    }
  }
  return { ...hit }
}
