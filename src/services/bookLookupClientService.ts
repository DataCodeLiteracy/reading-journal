import { getClientIdToken } from "@/lib/getClientIdToken"
import type { BookLookupMetadata } from "@/types/bookLookup"

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || "도서 검색 API 요청에 실패했습니다.")
  }
  return data
}

/** 카카오·국립중앙도서관 소장자료를 병렬 검색 */
export async function searchBooksByTitle(
  query: string,
  maxResults = 25,
): Promise<BookLookupMetadata[]> {
  const idToken = await getClientIdToken()
  const data = await postJson<{ items: BookLookupMetadata[] }>(
    "/api/book/lookup/search",
    {
      idToken,
      query,
      maxResults,
    },
  )
  return data.items ?? []
}

/** ISBN 서지 등으로 선택한 도서 메타데이터를 최종 보강 */
export async function resolveBookLookup(
  hit: BookLookupMetadata,
): Promise<BookLookupMetadata> {
  const idToken = await getClientIdToken()
  const data = await postJson<{ metadata: BookLookupMetadata }>(
    "/api/book/lookup/resolve",
    {
      idToken,
      hit,
    },
  )
  return data.metadata ?? hit
}
