import { getClientIdToken } from "@/lib/getClientIdToken"

export async function uploadBookCover(
  file: File,
  bookId?: string,
): Promise<string> {
  const idToken = await getClientIdToken()
  const form = new FormData()
  form.append("idToken", idToken)
  form.append("file", file)
  if (bookId) form.append("bookId", bookId)

  const res = await fetch("/api/uploads/book-cover", {
    method: "POST",
    body: form,
  })

  const data = (await res.json()) as { coverUrl?: string; error?: string }
  if (!res.ok || !data.coverUrl) {
    throw new Error(data.error || "표지 업로드에 실패했습니다.")
  }
  return data.coverUrl
}
