import { NextResponse } from "next/server"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import { uploadBookCoverImage } from "@/lib/cloudinaryServer"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const idToken = String(form.get("idToken") ?? "").trim()
    const file = form.get("file")
    const bookId = String(form.get("bookId") ?? "").trim() || undefined

    if (!idToken) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const verified = await verifyFirebaseIdToken(idToken)
    if (!verified) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const coverUrl = await uploadBookCoverImage(buffer, file.type || "image/jpeg", {
      userId: verified.uid,
      bookId,
    })

    return NextResponse.json({ coverUrl })
  } catch (e) {
    console.error("book-cover upload:", e)
    const message =
      e instanceof Error ? e.message : "표지 업로드 중 오류가 발생했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
