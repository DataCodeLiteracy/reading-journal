import { getClientIdToken } from "@/lib/getClientIdToken"
import type { AladinCategoryApplyLogEntry } from "@/types/aladinCategoryApplyLog"

export async function postAladinCategoryApplyLog(
  entry: Omit<AladinCategoryApplyLogEntry, "userId" | "createdAt">,
): Promise<void> {
  try {
    const idToken = await getClientIdToken()
    await fetch("/api/aladin/category-apply-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, entry }),
    })
  } catch {
    /* 로그 실패는 등록 흐름을 막지 않음 */
  }
}

export async function fetchAladinCategoryApplyLogs(
  limit = 100,
): Promise<AladinCategoryApplyLogEntry[]> {
  const idToken = await getClientIdToken()
  const res = await fetch(
    `/api/aladin/category-apply-log?limit=${limit}&idToken=${encodeURIComponent(idToken)}`,
  )
  const data = (await res.json()) as {
    logs?: AladinCategoryApplyLogEntry[]
    error?: string
  }
  if (!res.ok) {
    throw new Error(data.error || "로그를 불러오지 못했습니다.")
  }
  return data.logs ?? []
}
