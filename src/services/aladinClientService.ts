import { getClientIdToken } from "@/lib/getClientIdToken"
import type { AladinBookMetadata, AladinSearchHit } from "@/types/aladin"

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || "알라딘 API 요청에 실패했습니다.")
  }
  return data
}

export async function searchAladinByTitle(
  query: string,
  maxResults = 25,
): Promise<AladinSearchHit[]> {
  const idToken = await getClientIdToken()
  const data = await postJson<{ items: AladinSearchHit[] }>("/api/aladin/search", {
    idToken,
    query,
    maxResults,
  })
  return data.items ?? []
}

export async function lookupAladinBookMetadata(
  hit: AladinSearchHit,
): Promise<AladinBookMetadata> {
  const idToken = await getClientIdToken()
  const data = await postJson<{ metadata: AladinBookMetadata }>(
    "/api/aladin/lookup",
    { idToken, hit },
  )
  return data.metadata
}
