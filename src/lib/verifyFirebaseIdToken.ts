/**
 * 클라이언트에서 받은 Firebase ID 토큰을 Identity Toolkit으로 검증합니다.
 * (Firebase Admin SDK 없이 Route Handler에서 사용)
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey || !idToken) return null

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  )

  if (!res.ok) return null
  const data = (await res.json()) as {
    users?: Array<{ localId?: string }>
  }
  const uid = data.users?.[0]?.localId
  return uid ? { uid } : null
}
