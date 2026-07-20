import { FieldValue, type Firestore } from "firebase-admin/firestore"

type CanonicalSnap = {
  editionKey?: string
  title?: string
  author?: string
  publisher?: string
  publishedDate?: string
  isbn13?: string
  coverUrl?: string
  categoryDepth1Id?: string
  categoryDepth1Label?: string
  categoryDepth2Id?: string
  categoryDepth2Label?: string
  level?: string
}

/**
 * 모임 책(canonical)을 지정 유저 서재에 없으면 추가합니다. (Admin SDK)
 */
export async function ensureUserLibraryBookForCanonical(
  db: Firestore,
  userId: string,
  canonicalBookId: string,
): Promise<"created" | "exists" | "skipped"> {
  if (!userId || !canonicalBookId) return "skipped"

  const existing = await db
    .collection("books")
    .where("user_id", "==", userId)
    .where("canonicalBookId", "==", canonicalBookId)
    .limit(1)
    .get()
  if (!existing.empty) return "exists"

  const canonicalDoc = await db
    .collection("canonicalBooks")
    .doc(canonicalBookId)
    .get()
  if (!canonicalDoc.exists) return "skipped"
  const c = canonicalDoc.data() as CanonicalSnap

  await db.collection("books").add({
    user_id: userId,
    canonicalBookId,
    editionKey: c.editionKey ?? "",
    title: c.title ?? "제목 없음",
    author: c.author ?? "",
    publisher: c.publisher ?? "",
    publishedDate: c.publishedDate ?? "",
    ...(c.isbn13 ? { isbn13: c.isbn13 } : {}),
    ...(c.coverUrl ? { coverUrl: c.coverUrl } : {}),
    ...(c.level ? { level: c.level } : {}),
    ...(c.categoryDepth1Id
      ? {
          categoryDepth1Id: c.categoryDepth1Id,
          categoryDepth1Label: c.categoryDepth1Label,
          categoryDepth2Id: c.categoryDepth2Id,
          categoryDepth2Label: c.categoryDepth2Label,
        }
      : {}),
    status: "want-to-read",
    rating: 0,
    hasStartedReading: false,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  })

  await db
    .collection("canonicalBooks")
    .doc(canonicalBookId)
    .set(
      {
        user_ids: FieldValue.arrayUnion(userId),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

  return "created"
}

/** 모임의 활성 계정 멤버 user_id (+ 보호자의 자녀 링크) 목록 */
export async function listActiveMemberUserIdsForLibrarySync(
  db: Firestore,
  groupId: string,
): Promise<string[]> {
  const members = await db
    .collection("readingGroupMembers")
    .where("group_id", "==", groupId)
    .where("status", "==", "active")
    .get()

  const ids = new Set<string>()
  members.docs.forEach((doc) => {
    const data = doc.data() as {
      user_id?: string | null
      reads_for_user_id?: string | null
    }
    if (data.user_id) ids.add(data.user_id)
    if (data.reads_for_user_id) ids.add(data.reads_for_user_id)
  })
  return [...ids]
}

export async function syncCanonicalBooksToUsers(
  db: Firestore,
  userIds: string[],
  canonicalBookIds: string[],
): Promise<{ created: number; existed: number }> {
  let created = 0
  let existed = 0
  for (const userId of userIds) {
    for (const canonicalBookId of canonicalBookIds) {
      const result = await ensureUserLibraryBookForCanonical(
        db,
        userId,
        canonicalBookId,
      )
      if (result === "created") created += 1
      if (result === "exists") existed += 1
    }
  }
  return { created, existed }
}

export async function syncGroupBooksToUser(
  db: Firestore,
  groupId: string,
  userId: string,
): Promise<{ created: number; existed: number }> {
  const books = await db
    .collection("readingGroupBooks")
    .where("group_id", "==", groupId)
    .get()
  const canonicalIds = [
    ...new Set(
      books.docs
        .map((doc) => (doc.data() as { canonical_book_id?: string }).canonical_book_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const memberDoc = await db
    .collection("readingGroupMembers")
    .doc(`${groupId}__${userId}`)
    .get()
  const readsFor = (memberDoc.data() as { reads_for_user_id?: string } | undefined)
    ?.reads_for_user_id
  const targets = [userId, ...(readsFor ? [readsFor] : [])]
  return syncCanonicalBooksToUsers(db, targets, canonicalIds)
}

export async function syncCanonicalToAllGroupMembers(
  db: Firestore,
  groupId: string,
  canonicalBookId: string,
): Promise<{ created: number; existed: number }> {
  const userIds = await listActiveMemberUserIdsForLibrarySync(db, groupId)
  return syncCanonicalBooksToUsers(db, userIds, [canonicalBookId])
}
