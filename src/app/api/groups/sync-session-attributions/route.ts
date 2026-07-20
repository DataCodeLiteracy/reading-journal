import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import {
  calculateHalfOpenOverlapSeconds,
  effectiveAssignmentEndMs,
} from "@/utils/readingSessionAttribution"

/**
 * 타이머 세션의 그룹 독서 귀속을 Admin으로 재계산합니다.
 * 보호자인 경우 reads_for_user_id(자녀)에도 동일 시간을 귀속합니다.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string
      sessionId?: string
    }
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const sessionId = body.sessionId?.trim()
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 })
    }

    const db = getAdminFirestore()
    const sessionDoc = await db.collection("readingSessions").doc(sessionId).get()
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    }
    const session = sessionDoc.data() as {
      user_id: string
      bookId: string
      startTime: string
      endTime: string
      duration: number
      source?: string
    }
    if (session.user_id !== verified.uid) {
      return NextResponse.json({ error: "본인 세션만 동기화할 수 있습니다." }, { status: 403 })
    }

    const existingAttrs = await db
      .collection("readingGroupReadingAttributions")
      .where("reading_session_id", "==", sessionId)
      .get()
    const batchDelete = db.batch()
    existingAttrs.docs.forEach((doc) => batchDelete.delete(doc.ref))
    if (!existingAttrs.empty) await batchDelete.commit()

    if (session.source !== "timer") {
      return NextResponse.json({ ok: true, created: 0 })
    }

    const sessionStartMs = new Date(session.startTime).getTime()
    const sessionEndMs = new Date(session.endTime).getTime()
    if (
      !Number.isFinite(sessionStartMs) ||
      !Number.isFinite(sessionEndMs) ||
      sessionEndMs <= sessionStartMs
    ) {
      return NextResponse.json({ error: "세션 시간이 올바르지 않습니다." }, { status: 400 })
    }

    const bookDoc = await db.collection("books").doc(session.bookId).get()
    const canonicalBookId = (bookDoc.data() as { canonicalBookId?: string } | undefined)
      ?.canonicalBookId
    if (!canonicalBookId) {
      return NextResponse.json({ ok: true, created: 0 })
    }

    const memberships = await db
      .collection("readingGroupMembers")
      .where("user_id", "==", session.user_id)
      .where("status", "==", "active")
      .get()

    const attributedAt = new Date().toISOString()
    let created = 0

    for (const memberDoc of memberships.docs) {
      const membership = memberDoc.data() as {
        group_id: string
        display_name?: string
        member_kind?: string
        reads_for_user_id?: string | null
      }
      const assignments = await db
        .collection("readingGroupMeetingBookAssignments")
        .where("group_id", "==", membership.group_id)
        .where("canonical_book_id", "==", canonicalBookId)
        .get()

      const creditUserIds = new Set<string>([session.user_id])
      if (
        membership.member_kind === "guardian" &&
        membership.reads_for_user_id
      ) {
        creditUserIds.add(membership.reads_for_user_id)
      }

      for (const assignmentDoc of assignments.docs) {
        const assignment = assignmentDoc.data() as {
          reading_start_at: string
          reading_end_at: string
          stopped_at?: string
          group_book_id: string
          meeting_id: string
        }
        const assignmentStartMs = new Date(assignment.reading_start_at).getTime()
        const assignmentEndMs = effectiveAssignmentEndMs(
          assignment.reading_end_at,
          assignment.stopped_at,
        )
        if (
          !Number.isFinite(assignmentStartMs) ||
          !Number.isFinite(assignmentEndMs) ||
          assignmentEndMs <= assignmentStartMs
        ) {
          continue
        }
        const countedSeconds = calculateHalfOpenOverlapSeconds(
          sessionStartMs,
          sessionEndMs,
          assignmentStartMs,
          assignmentEndMs,
        )
        if (countedSeconds <= 0) continue

        for (const creditUserId of creditUserIds) {
          let displayName = membership.display_name || "모임원"
          if (creditUserId !== session.user_id) {
            const childMember = await db
              .collection("readingGroupMembers")
              .doc(`${membership.group_id}__${creditUserId}`)
              .get()
            displayName =
              (childMember.data() as { display_name?: string } | undefined)
                ?.display_name || "자녀"
          }
          const attributionId = `${sessionId}__${assignmentDoc.id}__${creditUserId}`
          await db
            .collection("readingGroupReadingAttributions")
            .doc(attributionId)
            .set({
              group_id: membership.group_id,
              reading_session_id: sessionId,
              user_id: creditUserId,
              user_display_name: displayName,
              group_book_id: assignment.group_book_id,
              meeting_id: assignment.meeting_id,
              meeting_book_assignment_id: assignmentDoc.id,
              canonical_book_id: canonicalBookId,
              session_start_at: session.startTime,
              session_end_at: session.endTime,
              counted_seconds: countedSeconds,
              attributed_at: attributedAt,
              created_at: FieldValue.serverTimestamp(),
              updated_at: FieldValue.serverTimestamp(),
            })
          created += 1
        }
      }
    }

    return NextResponse.json({ ok: true, created })
  } catch (error) {
    console.error("sync-session-attributions:", error)
    return NextResponse.json(
      { error: "독서 귀속 동기화에 실패했습니다." },
      { status: 500 },
    )
  }
}
