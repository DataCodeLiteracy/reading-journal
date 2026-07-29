import { FieldValue } from "firebase-admin/firestore"
import type { Firestore } from "firebase-admin/firestore"

export type BooksPublicBackfillResult = {
  total: number
  alreadyPublic: number
  leftPrivate: number
  updated: number
}

/**
 * 탐색 목록(`isBookPublic == true`)에 안 잡히는 책 보정.
 * 명시적으로 false인 책은 두고, 필드 없음·undefined만 true로 채웁니다.
 */
export async function backfillBooksPublicAdmin(
  db: Firestore,
): Promise<BooksPublicBackfillResult> {
  const snap = await db.collection("books").get()
  let alreadyPublic = 0
  let leftPrivate = 0
  let updated = 0

  const batchSize = 400
  let batch = db.batch()
  let ops = 0

  const commit = async () => {
    if (ops === 0) return
    await batch.commit()
    batch = db.batch()
    ops = 0
  }

  for (const doc of snap.docs) {
    const flag = doc.data().isBookPublic
    if (flag === true) {
      alreadyPublic += 1
      continue
    }
    if (flag === false) {
      leftPrivate += 1
      continue
    }
    batch.update(doc.ref, {
      isBookPublic: true,
      updated_at: FieldValue.serverTimestamp(),
    })
    ops += 1
    updated += 1
    if (ops >= batchSize) await commit()
  }
  await commit()

  return {
    total: snap.size,
    alreadyPublic,
    leftPrivate,
    updated,
  }
}
