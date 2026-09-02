import { getClientIdToken } from "@/lib/getClientIdToken"
import type { BookLookupMetadata } from "@/types/bookLookup"
import type { NlkEnrichment } from "@/lib/nlkOpenApi"

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || "국립중앙도서관 API 요청에 실패했습니다.")
  }
  return data
}

/** 카카오 검색 결과를 국립중앙도서관으로 보강 (키 없으면 빈 객체) */
export async function enrichBookLookupFromNlkClient(
  hit: BookLookupMetadata,
): Promise<NlkEnrichment> {
  try {
    const idToken = await getClientIdToken()
    const data = await postJson<{ enrichment: NlkEnrichment }>("/api/nlk/enrich", {
      idToken,
      hit,
    })
    return data.enrichment ?? {}
  } catch (e) {
    console.warn("nlk enrich client:", e)
    return {}
  }
}
