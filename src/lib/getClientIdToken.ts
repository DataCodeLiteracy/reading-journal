import { auth } from "@/lib/firebase"

export async function getClientIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error("로그인이 필요합니다.")
  return user.getIdToken()
}
