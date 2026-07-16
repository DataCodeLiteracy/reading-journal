import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

/**
 * 현재 모임장이 다른 활성 계정 멤버에게 모임장 역할을 넘깁니다.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      groupId?: string
      newOwnerUserId?: string
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const groupId = body.groupId?.trim()
    const newOwnerUserId = body.newOwnerUserId?.trim()
    if (!groupId || !newOwnerUserId) {
      return NextResponse.json(
        { error: "모임과 새 모임장을 지정해 주세요." },
        { status: 400 },
      )
    }
    if (newOwnerUserId === verified.uid) {
      return NextResponse.json(
        { error: "이미 모임장입니다." },
        { status: 400 },
      )
    }

    const db = getAdminFirestore()
    const groupRef = db.collection("readingGroups").doc(groupId)
    const currentOwnerRef = db
      .collection("readingGroupMembers")
      .doc(`${groupId}__${verified.uid}`)
    const newOwnerRef = db
      .collection("readingGroupMembers")
      .doc(`${groupId}__${newOwnerUserId}`)

    await db.runTransaction(async (transaction) => {
      const [groupSnap, currentOwnerSnap, newOwnerSnap] = await Promise.all([
        transaction.get(groupRef),
        transaction.get(currentOwnerRef),
        transaction.get(newOwnerRef),
      ])
      if (!groupSnap.exists) {
        throw new Error("NOT_FOUND_GROUP")
      }
      const group = groupSnap.data()!
      if (group.owner_user_id !== verified.uid) {
        throw new Error("FORBIDDEN")
      }
      if (
        !currentOwnerSnap.exists ||
        currentOwnerSnap.data()?.role !== "owner" ||
        currentOwnerSnap.data()?.status !== "active"
      ) {
        throw new Error("FORBIDDEN")
      }
      if (
        !newOwnerSnap.exists ||
        newOwnerSnap.data()?.user_id !== newOwnerUserId ||
        newOwnerSnap.data()?.status !== "active"
      ) {
        throw new Error("INVALID_MEMBER")
      }

      transaction.update(groupRef, {
        owner_user_id: newOwnerUserId,
        updated_at: FieldValue.serverTimestamp(),
      })
      transaction.update(currentOwnerRef, {
        role: "member",
        updated_at: FieldValue.serverTimestamp(),
      })
      transaction.update(newOwnerRef, {
        role: "owner",
        updated_at: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND_GROUP") {
        return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 })
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "모임장만 역할을 넘길 수 있습니다." },
          { status: 403 },
        )
      }
      if (error.message === "INVALID_MEMBER") {
        return NextResponse.json(
          { error: "계정으로 연결된 활성 멤버에게만 넘길 수 있습니다." },
          { status: 400 },
        )
      }
    }
    console.error("reading group transfer ownership:", error)
    return NextResponse.json(
      { error: "모임장 역할을 넘기지 못했습니다." },
      { status: 500 },
    )
  }
}
