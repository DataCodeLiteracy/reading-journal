import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import type { Firestore } from "firebase-admin/firestore"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyAdminRequest, getIdTokenFromRequest } from "@/lib/verifyAdminRequest"
import {
  loadBookCategorySeedFromPublic,
  listBookCategorySeedFiles,
  parseBookCategorySeedJson,
  type BookCategorySeedPayload,
} from "@/lib/bookCategorySeedFile"

const D1 = "bookCategoryDepth1"
const D2 = "bookCategoryDepth2"

async function applyBookCategorySeed(
  db: Firestore,
  payload: BookCategorySeedPayload
): Promise<{ depth1Count: number; depth2Count: number }> {
  const existing = await db.collection(D1).limit(1).get()
  if (!existing.empty) {
    throw new Error(
      "이미 분야 데이터가 있습니다. 시드는 Firestore가 비어 있을 때만 가능합니다."
    )
  }
  const batch = db.batch()
  const now = FieldValue.serverTimestamp()
  for (const d of payload.depth1) {
    batch.set(db.collection(D1).doc(d.id), { ...d, created_at: now, updated_at: now })
  }
  for (const d of payload.depth2) {
    batch.set(db.collection(D2).doc(d.id), { ...d, created_at: now, updated_at: now })
  }
  await batch.commit()
  return { depth1Count: payload.depth1.length, depth2Count: payload.depth2.length }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const idToken =
      url.searchParams.get("idToken") ||
      (await getIdTokenFromRequest(req)) ||
      ""
    const admin = await verifyAdminRequest(req, { idToken })
    if (admin instanceof NextResponse) return admin

    const files = await listBookCategorySeedFiles()
    return NextResponse.json({ files, defaultFile: "default.json" })
  } catch (e) {
    console.error("book-categories GET:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    )
  }
}

function slugId(prefix: string, label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w가-힣_-]/g, "")
    .slice(0, 24)
  return `${prefix}_${base || "item"}_${Date.now().toString(36)}`
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      action?: string
      file?: string
      seed?: unknown
      level?: 1 | 2
      label?: string
      parentId?: string
      order?: number
      isOther?: boolean
      isActive?: boolean
    }

    const admin = await verifyAdminRequest(req, body)
    if (admin instanceof NextResponse) return admin

    const db = getAdminFirestore()

    if (body.action === "seed" || body.action === "seedFromJson") {
      try {
        const payload =
          body.action === "seedFromJson"
            ? parseBookCategorySeedJson(body.seed)
            : await loadBookCategorySeedFromPublic(
                (body.file ?? "default.json").trim() || "default.json"
              )
        const counts = await applyBookCategorySeed(db, payload)
        const source =
          body.action === "seedFromJson"
            ? "upload"
            : `public/분야/${(body.file ?? "default.json").trim() || "default.json"}`
        return NextResponse.json({ ok: true, seeded: true, source, ...counts })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "시드 실패"
        const status = msg.includes("이미 분야") ? 400 : 400
        return NextResponse.json({ error: msg }, { status })
      }
    }

    if (body.action === "create") {
      const label = (body.label ?? "").trim()
      if (!label) {
        return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 })
      }
      const now = FieldValue.serverTimestamp()
      if (body.level === 1) {
        const id = slugId("d1", label)
        const order =
          typeof body.order === "number"
            ? body.order
            : (await db.collection(D1).count().get()).data().count
        await db.collection(D1).doc(id).set({
          id,
          label,
          order,
          isActive: true,
          created_at: now,
          updated_at: now,
        })
        return NextResponse.json({ ok: true, id })
      }
      if (body.level === 2) {
        const parentId = (body.parentId ?? "").trim()
        if (!parentId) {
          return NextResponse.json({ error: "parentId가 필요합니다." }, { status: 400 })
        }
        const id = slugId("d2", label)
        const siblings = await db
          .collection(D2)
          .where("parentId", "==", parentId)
          .get()
        const order =
          typeof body.order === "number" ? body.order : siblings.size
        await db.collection(D2).doc(id).set({
          id,
          parentId,
          label,
          order,
          isActive: true,
          isOther: body.isOther === true,
          created_at: now,
          updated_at: now,
        })
        return NextResponse.json({ ok: true, id })
      }
      return NextResponse.json({ error: "level은 1 또는 2입니다." }, { status: 400 })
    }

    return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 })
  } catch (e) {
    console.error("book-categories POST:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      level?: 1 | 2
      id?: string
      label?: string
      order?: number
      isActive?: boolean
      isOther?: boolean
      parentId?: string
    }

    const admin = await verifyAdminRequest(req, body)
    if (admin instanceof NextResponse) return admin

    const id = (body.id ?? "").trim()
    if (!id || !body.level) {
      return NextResponse.json({ error: "id와 level이 필요합니다." }, { status: 400 })
    }

    const db = getAdminFirestore()
    const col = body.level === 1 ? D1 : D2
    const ref = db.collection(col).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 })
    }

    const patch: Record<string, unknown> = { updated_at: FieldValue.serverTimestamp() }
    if (body.label !== undefined) patch.label = body.label.trim()
    if (typeof body.order === "number") patch.order = body.order
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive
    if (body.level === 2 && typeof body.isOther === "boolean") patch.isOther = body.isOther
    if (body.level === 2 && body.parentId) patch.parentId = body.parentId.trim()

    await ref.update(patch)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("book-categories PATCH:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string
      level?: 1 | 2
      id?: string
    }

    const admin = await verifyAdminRequest(req, body)
    if (admin instanceof NextResponse) return admin

    const id = (body.id ?? "").trim()
    if (!id || !body.level) {
      return NextResponse.json({ error: "id와 level이 필요합니다." }, { status: 400 })
    }

    const db = getAdminFirestore()

    if (body.level === 1) {
      const children = await db.collection(D2).where("parentId", "==", id).get()
      const batch = db.batch()
      children.docs.forEach((d) => batch.delete(d.ref))
      batch.delete(db.collection(D1).doc(id))
      await batch.commit()
      return NextResponse.json({ ok: true, deletedChildren: children.size })
    }

    await db.collection(D2).doc(id).delete()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("book-categories DELETE:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    )
  }
}
