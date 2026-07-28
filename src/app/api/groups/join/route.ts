import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { syncGroupBooksToUser } from "@/lib/groupLibrarySyncAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

type RoleOption = "participant" | "guardian" | "both"

function rolesFromBody(body: {
  memberKind?: string
  memberRoles?: string[]
  roleOption?: string
}): { roles: ("participant" | "guardian")[]; legacyKind: "participant" | "guardian" } {
  const option = (body.roleOption || body.memberKind || "participant") as RoleOption
  if (Array.isArray(body.memberRoles) && body.memberRoles.length > 0) {
    const roles = [
      ...new Set(
        body.memberRoles.filter(
          (role): role is "participant" | "guardian" =>
            role === "participant" || role === "guardian",
        ),
      ),
    ]
    if (roles.length > 0) {
      return {
        roles,
        legacyKind:
          roles.includes("guardian") && !roles.includes("participant")
            ? "guardian"
            : "participant",
      }
    }
  }
  if (option === "both") {
    return { roles: ["participant", "guardian"], legacyKind: "participant" }
  }
  if (option === "guardian") {
    return { roles: ["guardian"], legacyKind: "guardian" }
  }
  return { roles: ["participant"], legacyKind: "participant" }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      inviteCode?: string
      displayName?: string
      memberKind?: string
      memberRoles?: string[]
      roleOption?: string
      readsForUserId?: string
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const inviteCode = body.inviteCode?.trim().toUpperCase()
    const displayName = body.displayName?.trim()
    const { roles, legacyKind } = rolesFromBody(body)
    const readsForUserId =
      legacyKind === "guardian" ? body.readsForUserId?.trim() || null : null
    if (!inviteCode || !displayName) {
      return NextResponse.json(
        { error: "초대 코드와 표시 이름을 입력해주세요." },
        { status: 400 },
      )
    }

    const db = getAdminFirestore()
    const groupSnapshot = await db
      .collection("readingGroups")
      .where("invite_code", "==", inviteCode)
      .where("status", "==", "active")
      .limit(1)
      .get()
    const groupDocument = groupSnapshot.docs[0]
    if (!groupDocument) {
      return NextResponse.json(
        { error: "유효한 초대 코드를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    const memberRef = db
      .collection("readingGroupMembers")
      .doc(`${groupDocument.id}__${verified.uid}`)
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(memberRef)
      const now = new Date().toISOString()
      transaction.set(
        memberRef,
        {
          group_id: groupDocument.id,
          user_id: verified.uid,
          display_name: displayName,
          role: "member",
          member_kind: legacyKind,
          member_roles: roles,
          status: "active",
          joined_at: now,
          updated_at: FieldValue.serverTimestamp(),
          ...(readsForUserId
            ? { reads_for_user_id: readsForUserId }
            : { reads_for_user_id: FieldValue.delete() }),
          ...(existing.exists
            ? {}
            : { created_at: FieldValue.serverTimestamp() }),
        },
        { merge: true },
      )
    })

    try {
      await syncGroupBooksToUser(db, groupDocument.id, verified.uid)
    } catch (syncError) {
      console.error("reading group join library sync:", syncError)
    }

    return NextResponse.json({ ok: true, groupId: groupDocument.id })
  } catch (error) {
    console.error("reading group join:", error)
    return NextResponse.json({ error: "모임 가입에 실패했습니다." }, { status: 500 })
  }
}
