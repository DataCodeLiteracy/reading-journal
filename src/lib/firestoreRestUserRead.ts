/**
 * 사용자 Firebase ID 토큰으로 Firestore REST 문서 읽기 (Security Rules의 request.auth 적용).
 * Route Handler에서만 사용. 실패 시 null.
 */
function decodeFirestoreValue(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object") return null
  const v = raw as Record<string, unknown>
  if ("stringValue" in v) return v.stringValue ?? ""
  if ("booleanValue" in v) return Boolean(v.booleanValue)
  if ("integerValue" in v) return Number(v.integerValue)
  if ("doubleValue" in v) return Number(v.doubleValue)
  if ("nullValue" in v) return null
  if ("mapValue" in v && v.mapValue && typeof v.mapValue === "object") {
    const fields = (v.mapValue as { fields?: Record<string, unknown> }).fields
    if (!fields) return {}
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(val)
    }
    return out
  }
  return null
}

export async function getFirestoreDocumentMapAsUser(
  projectId: string,
  path: string,
  idToken: string
): Promise<Record<string, unknown> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(path)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  })
  if (!res.ok) return null
  const data = (await res.json()) as { fields?: Record<string, unknown> }
  if (!data.fields) return {}
  const flat: Record<string, unknown> = {}
  for (const [k, val] of Object.entries(data.fields)) {
    flat[k] = decodeFirestoreValue(val)
  }
  return flat
}
