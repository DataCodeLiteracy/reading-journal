import { getClientIdToken } from "@/lib/getClientIdToken"
import type { BookSearchHit } from "@/types/bookLookup"

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

export async function searchKakaoBooksByTitle(
  query: string,
  maxResults = 25,
): Promise<BookSearchHit[]> {
  const idToken = await getClientIdToken()
  const data = await postJson<{ items: BookSearchHit[] }>(
    "/api/kakao/book/search",
    {
      idToken,
      query,
      maxResults,
    },
  )
  return data.items ?? []
}
