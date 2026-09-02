import {
  buildKdcClassification,
  parseSubjectTerms,
} from "@/lib/kdcClassification"
import type { BookKdcClassification } from "@/types/bookClassification"
import type { BookLookupMetadata } from "@/types/bookLookup"
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities"
import { stripHtmlTags } from "@/utils/stripHtmlTags"

const NLK_COLLECTION_SEARCH_URL =
  "https://www.nl.go.kr/NL/search/openApi/search.do"
const NLK_SEOJI_SEARCH_URL = "https://www.nl.go.kr/seoji/SearchApi.do"

export type NlkEnrichment = Partial<BookLookupMetadata> &
  BookKdcClassification & {
    subjects?: string[]
    pageCount?: string
  }

export type NlkCollectionItem = {
  titleInfo?: string
  title_info?: string
  authorInfo?: string
  author_info?: string
  pubInfo?: string
  pub_info?: string
  pubYearInfo?: string
  pub_year_info?: string
  isbn?: string
  callNo?: string
  call_no?: string
  kdcCode1s?: string
  kdc_code_1s?: string
  kdcName1s?: string
  kdc_name_1s?: string
  controlNo?: string
  control_no?: string
}

type NlkCollectionResponse = {
  errorCode?: string
  errorMsg?: string
  result?: NlkCollectionItem[]
  total?: number | string
}

type NlkSeojiItem = {
  TITLE?: string
  AUTHOR?: string
  PUBLISHER?: string
  PUBLISH_PREDATE?: string
  EA_ISBN?: string
  KDC?: string
  SUBJECT?: string
  PAGE?: string
  TITLE_URL?: string
}

type NlkSeojiResponse = {
  errorCode?: string
  errorMsg?: string
  docs?: NlkSeojiItem[]
  item?: NlkSeojiItem | NlkSeojiItem[]
}

function getNlkApiKey(): string | null {
  const key = process.env.NLK_API_KEY?.trim()
  return key || null
}

function str(v: unknown): string {
  if (v == null) return ""
  return String(v).trim()
}

function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[^0-9Xx]/g, "")
}

function pickItemField<T extends Record<string, unknown>>(
  item: T,
  ...keys: string[]
): string {
  for (const key of keys) {
    const v = item[key]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ""
}

function assertNlkOk(data: { errorCode?: string; errorMsg?: string }) {
  const code = data.errorCode?.trim()
  if (!code || code === "000") return
  throw new Error(data.errorMsg?.trim() || `국립중앙도서관 API 오류 (${code})`)
}

function normalizeCollectionItems(
  data: NlkCollectionResponse,
): NlkCollectionItem[] {
  if (!Array.isArray(data.result)) return []
  return data.result
}

async function fetchNlkCollection(
  params: Record<string, string>,
): Promise<NlkCollectionResponse> {
  const key = getNlkApiKey()
  if (!key) {
    throw new Error("NLK_API_KEY 환경변수가 설정되지 않았습니다.")
  }

  const url = new URL(NLK_COLLECTION_SEARCH_URL)
  url.searchParams.set("key", key)
  url.searchParams.set("apiType", "json")
  url.searchParams.set("pageNum", params.pageNum ?? "1")
  url.searchParams.set("pageSize", params.pageSize ?? "10")
  for (const [k, v] of Object.entries(params)) {
    if (k === "pageNum" || k === "pageSize") continue
    if (v) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`국립중앙도서관 소장자료 API 오류 (${res.status})`)
  }

  const data = JSON.parse(text) as NlkCollectionResponse
  assertNlkOk(data)
  return data
}

export async function nlkSearchCollectionByKeyword(
  keyword: string,
  pageSize = 25,
): Promise<NlkCollectionItem[]> {
  const kwd = keyword.trim()
  if (!kwd) return []

  const size = Math.min(Math.max(pageSize, 1), 50)
  const data = await fetchNlkCollection({
    srchTarget: "total",
    kwd,
    category: "도서",
    systemType: "오프라인자료",
    pageNum: "1",
    pageSize: String(size),
  })
  return normalizeCollectionItems(data)
}

export async function nlkSearchCollectionByIsbn(
  isbn13: string,
): Promise<NlkCollectionItem[]> {
  const isbn = normalizeIsbn(isbn13)
  if (isbn.length < 10) return []

  const data = await fetchNlkCollection({
    detailSearch: "true",
    isbnOp: "isbn",
    isbnCode: isbn,
    category: "도서",
    systemType: "오프라인자료",
  })
  return normalizeCollectionItems(data)
}

function normalizeSeojiItems(data: NlkSeojiResponse): NlkSeojiItem[] {
  if (Array.isArray(data.docs)) return data.docs
  if (!data.item) return []
  return Array.isArray(data.item) ? data.item : [data.item]
}

async function nlkSearchSeojiByIsbn(isbn13: string): Promise<NlkSeojiItem | null> {
  const key = getNlkApiKey()
  if (!key) return null

  const isbn = normalizeIsbn(isbn13)
  if (isbn.length < 10) return null

  const url = new URL(NLK_SEOJI_SEARCH_URL)
  url.searchParams.set("cert_key", key)
  url.searchParams.set("result_style", "json")
  url.searchParams.set("page_no", "1")
  url.searchParams.set("page_size", "5")
  url.searchParams.set("isbn", isbn)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) return null

  const data = (await res.json()) as NlkSeojiResponse
  if (data.errorCode && data.errorCode !== "000") return null

  const items = normalizeSeojiItems(data)
  return items[0] ?? null
}

function parsePubYear(pubYear: string): string | undefined {
  const trimmed = pubYear.trim()
  const full = trimmed.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (full) {
    const mm = full[2].padStart(2, "0")
    const dd = full[3].padStart(2, "0")
    return `${full[1]}-${mm}-${dd}`
  }
  const yearOnly = trimmed.match(/\b(19|20)\d{2}\b/)
  if (yearOnly) return `${yearOnly[0]}-01-01`
  return undefined
}

export function mapNlkCollectionToMetadata(
  item: NlkCollectionItem,
): BookLookupMetadata {
  const title = stripHtmlTags(
    pickItemField(item, "titleInfo", "title_info"),
  )
  const author = stripHtmlTags(
    pickItemField(item, "authorInfo", "author_info"),
  )
  const publisher = stripHtmlTags(pickItemField(item, "pubInfo", "pub_info"))
  const pubYear = pickItemField(item, "pubYearInfo", "pub_year_info")
  const isbnNorm = normalizeIsbn(pickItemField(item, "isbn"))
  const isbn13 =
    isbnNorm.length >= 13
      ? isbnNorm.slice(-13)
      : isbnNorm.length >= 10
        ? isbnNorm
        : undefined

  const enrichment = mapCollectionItemToEnrichment(item)

  return {
    title: title || "",
    author: author || "",
    publisher: publisher || undefined,
    publishedDate: parsePubYear(pubYear),
    isbn13,
    ...enrichment,
  }
}

export function indexNlkCollectionByIsbn(
  items: NlkCollectionItem[],
): Map<string, NlkCollectionItem> {
  const map = new Map<string, NlkCollectionItem>()
  for (const item of items) {
    const isbn = normalizeIsbn(pickItemField(item, "isbn"))
    if (!isbn) continue
    map.set(isbn, item)
    if (isbn.length >= 10) map.set(isbn.slice(-10), item)
    if (isbn.length >= 13) map.set(isbn.slice(-13), item)
  }
  return map
}

function mapCollectionItemToEnrichment(
  item: NlkCollectionItem,
): NlkEnrichment {
  const callNo = pickItemField(item, "callNo", "call_no")
  const majorCode = pickItemField(item, "kdcCode1s", "kdc_code_1s")
  const majorLabel = pickItemField(item, "kdcName1s", "kdc_name_1s")

  const kdc = buildKdcClassification({
    majorCode: majorCode || undefined,
    majorLabel: majorLabel || undefined,
    callNo: callNo || undefined,
  })

  return { ...kdc }
}

function mapSeojiItemToEnrichment(item: NlkSeojiItem): NlkEnrichment {
  const enrichment: NlkEnrichment = {}

  const title = stripHtmlTags(str(item.TITLE))
  if (title) enrichment.title = title

  const author = str(item.AUTHOR)
  if (author) enrichment.author = decodeHtmlEntities(author)

  const publisher = str(item.PUBLISHER)
  if (publisher) enrichment.publisher = publisher

  const pubDate = str(item.PUBLISH_PREDATE)
  if (/^\d{4}-\d{2}-\d{2}$/.test(pubDate)) {
    enrichment.publishedDate = pubDate
  } else if (/^\d{8}$/.test(pubDate)) {
    enrichment.publishedDate = `${pubDate.slice(0, 4)}-${pubDate.slice(4, 6)}-${pubDate.slice(6, 8)}`
  }

  const isbn = normalizeIsbn(str(item.EA_ISBN))
  if (isbn.length >= 13) enrichment.isbn13 = isbn.slice(-13)

  const cover = str(item.TITLE_URL)
  if (cover) enrichment.coverUrl = cover

  const page = str(item.PAGE)
  if (page) enrichment.pageCount = page

  const kdcDetail = str(item.KDC)
  const kdc = buildKdcClassification({
    kdcDetail: kdcDetail || undefined,
  })

  const subjects = parseSubjectTerms(str(item.SUBJECT))
  if (subjects.length) enrichment.subjects = subjects

  return { ...kdc, ...enrichment }
}

function mergeEnrichment(
  base: NlkEnrichment,
  extra: NlkEnrichment,
): NlkEnrichment {
  return {
    title: base.title || extra.title,
    author: base.author || extra.author,
    publisher: base.publisher || extra.publisher,
    publishedDate: base.publishedDate || extra.publishedDate,
    coverUrl: extra.coverUrl || base.coverUrl,
    isbn13: base.isbn13 || extra.isbn13,
    pageCount: base.pageCount || extra.pageCount,
    kdcMajorCode: base.kdcMajorCode || extra.kdcMajorCode,
    kdcMajorLabel: base.kdcMajorLabel || extra.kdcMajorLabel,
    kdcMiddleCode: base.kdcMiddleCode || extra.kdcMiddleCode,
    kdcMiddleLabel: base.kdcMiddleLabel || extra.kdcMiddleLabel,
    kdcDetailCode: base.kdcDetailCode || extra.kdcDetailCode,
    subjects: [...new Set([...(base.subjects ?? []), ...(extra.subjects ?? [])])],
  }
}

/** 카카오 등 1차 검색 결과를 국립중앙도서관으로 보강 (키 없으면 빈 객체) */
export async function enrichBookLookupFromNlk(
  hit: BookLookupMetadata,
): Promise<NlkEnrichment> {
  if (!getNlkApiKey()) return {}

  let enrichment: NlkEnrichment = {}

  try {
    if (hit.isbn13?.trim()) {
      const [collectionItems, seojiItem] = await Promise.all([
        nlkSearchCollectionByIsbn(hit.isbn13),
        nlkSearchSeojiByIsbn(hit.isbn13),
      ])

      if (collectionItems[0]) {
        enrichment = mergeEnrichment(
          enrichment,
          mapCollectionItemToEnrichment(collectionItems[0]),
        )
      }
      if (seojiItem) {
        enrichment = mergeEnrichment(
          enrichment,
          mapSeojiItemToEnrichment(seojiItem),
        )
      }
    }

    if (!enrichment.kdcMajorCode && hit.title?.trim()) {
      const collectionItems = await nlkSearchCollectionByKeyword(hit.title)
      const match =
        collectionItems.find((item) => {
          const isbn = normalizeIsbn(pickItemField(item, "isbn"))
          return hit.isbn13 && isbn.includes(normalizeIsbn(hit.isbn13))
        }) ?? collectionItems[0]

      if (match) {
        enrichment = mergeEnrichment(
          enrichment,
          mapCollectionItemToEnrichment(match),
        )
      }
    }
  } catch (e) {
    console.warn("nlk enrich:", e)
    return {}
  }

  return enrichment
}

export function isNlkConfigured(): boolean {
  return Boolean(getNlkApiKey())
}
