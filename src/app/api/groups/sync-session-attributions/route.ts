import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"
import {
  calculateHalfOpenOverlapSeconds,
  effectiveAssignmentEndMs,
} from "@/utils/readingSessionAttribution"

type Segment = {
  child_user_ids?: string[]
  startTime: string
  endTime: string
}

function resolveRoles(membership: {
  member_kind?: string
  member_roles?: string[]
}): Set<"participant" | "guardian"> {
  if (Array.isArray(membership.member_roles) && membership.member_roles.length) {
    return new Set(
      membership.member_roles.filter(
        (role): role is "participant" | "guardian" =>
          role === "participant" || role === "guardian",
      ),
    )
  }
  if (membership.member_kind === "guardian") return new Set(["guardian"])
  return new Set(["participant"])
}

/**
 * 타이머 세션의 그룹 독서 귀속을 Admin으로 재계산합니다.
 * - 본인 세션은 본인에게 귀속
 * - 읽어주기(read_aloud)면 같은 모임의 자녀 멤버에게 구간 겹침만큼 귀속
 * - legacy reads_for_user_id도 호환
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
      reading_mode?: string
      read_aloud_segments?: Segment[]
      read_aloud_parent_session_id?: string
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
    // 자녀에게 복제된 세션은 보호자 원본 세션 귀속으로 처리합니다.
    if (session.read_aloud_parent_session_id) {
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

    const segments =
      session.reading_mode === "read_aloud" &&
      Array.isArray(session.read_aloud_segments)
        ? session.read_aloud_segments
        : []

    const attributedAt = new Date().toISOString()
    let created = 0

    for (const memberDoc of memberships.docs) {
      const membership = memberDoc.data() as {
        group_id: string
        display_name?: string
        member_kind?: string
        member_roles?: string[]
        reads_for_user_id?: string | null
      }
      const roles = resolveRoles(membership)
      const assignments = await db
        .collection("readingGroupMeetingBookAssignments")
        .where("group_id", "==", membership.group_id)
        .where("canonical_book_id", "==", canonicalBookId)
        .get()

      const groupMembers = await db
        .collection("readingGroupMembers")
        .where("group_id", "==", membership.group_id)
        .where("status", "==", "active")
        .get()
      const memberUserIds = new Set(
        groupMembers.docs
          .map((doc) => (doc.data() as { user_id?: string | null }).user_id)
          .filter((id): id is string => Boolean(id)),
      )

      type Credit = { userId: string; seconds: number }
      const creditsByUser = new Map<string, number>()

      const addCredit = (userId: string, seconds: number) => {
        if (seconds <= 0) return
        creditsByUser.set(userId, (creditsByUser.get(userId) ?? 0) + seconds)
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

        const selfSeconds = calculateHalfOpenOverlapSeconds(
          sessionStartMs,
          sessionEndMs,
          assignmentStartMs,
          assignmentEndMs,
        )
        if (selfSeconds > 0) {
          addCredit(session.user_id, selfSeconds)
        }

        // legacy dual credit
        if (
          roles.has("guardian") &&
          membership.reads_for_user_id &&
          memberUserIds.has(membership.reads_for_user_id)
        ) {
          addCredit(membership.reads_for_user_id, selfSeconds)
        }

        // read-aloud segment credits for member children only
        if (segments.length > 0) {
          for (const segment of segments) {
            const segStart = new Date(segment.startTime).getTime()
            const segEnd = new Date(segment.endTime).getTime()
            if (
              !Number.isFinite(segStart) ||
              !Number.isFinite(segEnd) ||
              segEnd <= segStart
            ) {
              continue
            }
            const segSeconds = calculateHalfOpenOverlapSeconds(
              segStart,
              segEnd,
              assignmentStartMs,
              assignmentEndMs,
            )
            if (segSeconds <= 0) continue
            for (const childId of segment.child_user_ids ?? []) {
              if (!memberUserIds.has(childId)) continue
              addCredit(childId, segSeconds)
            }
          }
        }

        const credits: Credit[] = [...creditsByUser.entries()].map(
          ([userId, seconds]) => ({ userId, seconds }),
        )
        creditsByUser.clear()

        for (const credit of credits) {
          let displayName = membership.display_name || "모임원"
          if (credit.userId !== session.user_id) {
            const childMember = await db
              .collection("readingGroupMembers")
              .doc(`${membership.group_id}__${credit.userId}`)
              .get()
            displayName =
              (childMember.data() as { display_name?: string } | undefined)
                ?.display_name || "자녀"
          }
          const attributionId = `${sessionId}__${assignmentDoc.id}__${credit.userId}`
          await db
            .collection("readingGroupReadingAttributions")
            .doc(attributionId)
            .set({
              group_id: membership.group_id,
              reading_session_id: sessionId,
              user_id: credit.userId,
              user_display_name: displayName,
              group_book_id: assignment.group_book_id,
              meeting_id: assignment.meeting_id,
              meeting_book_assignment_id: assignmentDoc.id,
              canonical_book_id: canonicalBookId,
              session_start_at: session.startTime,
              session_end_at: session.endTime,
              counted_seconds: credit.seconds,
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
