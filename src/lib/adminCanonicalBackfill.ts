import { FieldValue } from "firebase-admin/firestore"
import type { Firestore } from "firebase-admin/firestore"
import { normalizeBookTitleKey } from "@/utils/bookTitleKey"
import {
  editionKeyFromBook,
  primaryCanonicalDocId,
} from "@/utils/editionKeyDocId"
import { titleKeyToPackDocId } from "@/utils/titleKeyDocId"

type BookRow = {
  id: string
  user_id: string
  title: string
  publisher?: string
  author?: string
  publishedDate?: string
  isbn13?: string
  coverUrl?: string
  categoryDepth1Id?: string
  categoryDepth1Label?: string
  categoryDepth2Id?: string
  categoryDepth2Label?: string
  level?: string
  tocOutline?: unknown[]
  canonicalBookId?: string
  editionKey?: string
}

export type CanonicalBackfillScan = {
  totalBooks: number
  booksWithoutCanonical: number
  canonicalBooksCount: number
  titleOnlyPacks: number
  packsWithCanonical: number
  goldenBellWithoutCanonical: number
  goldenBellWithCanonical: number
}

export type CanonicalBackfillStepResult = {
  scan?: CanonicalBackfillScan
  canonical?: { created: number; linked: number; groups: number }
  packs?: { migrated: number; skipped: number; merged: number }
  goldenBell?: { updated: number; skipped: number }
}

const BOOKS = "books"
const CANONICAL = "canonicalBooks"
const PACKS = "readingContentPacks"
const GOLDEN_BELL = "goldenBellQuizzes"

function editionKey(title: string, publisher?: string): string {
  return editionKeyFromBook(title, publisher)
}

function pickBibliographic(seed: BookRow) {
  return {
    title: seed.title.trim(),
    ...(seed.author?.trim() ? { author: seed.author.trim() } : {}),
    ...(seed.publisher?.trim() ? { publisher: seed.publisher.trim() } : {}),
    ...(seed.publishedDate?.trim()
      ? { publishedDate: seed.publishedDate.trim() }
      : {}),
    ...(seed.isbn13?.trim() ? { isbn13: seed.isbn13.trim() } : {}),
    ...(seed.coverUrl?.trim() ? { coverUrl: seed.coverUrl.trim() } : {}),
    ...(seed.categoryDepth1Id
      ? {
          categoryDepth1Id: seed.categoryDepth1Id,
          categoryDepth1Label: seed.categoryDepth1Label,
        }
      : {}),
    ...(seed.categoryDepth2Id
      ? {
          categoryDepth2Id: seed.categoryDepth2Id,
          categoryDepth2Label: seed.categoryDepth2Label,
        }
      : {}),
    ...(seed.level ? { level: seed.level } : {}),
  }
}

export async function scanCanonicalBackfill(
  db: Firestore,
): Promise<CanonicalBackfillScan> {
  const [booksSnap, canonSnap, packsSnap, gbSnap] = await Promise.all([
    db.collection(BOOKS).get(),
    db.collection(CANONICAL).get(),
    db.collection(PACKS).get(),
    db.collection(GOLDEN_BELL).get(),
  ])

  const books = booksSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BookRow)
  const booksWithoutCanonical = books.filter((b) => !b.canonicalBookId).length

  let titleOnlyPacks = 0
  let packsWithCanonical = 0
  for (const d of packsSnap.docs) {
    const data = d.data()
    if (data.canonicalBookId) packsWithCanonical += 1
    else titleOnlyPacks += 1
  }

  let goldenBellWithoutCanonical = 0
  let goldenBellWithCanonical = 0
  for (const d of gbSnap.docs) {
    if (d.data().canonicalBookId) goldenBellWithCanonical += 1
    else goldenBellWithoutCanonical += 1
  }

  return {
    totalBooks: books.length,
    booksWithoutCanonical,
    canonicalBooksCount: canonSnap.size,
    titleOnlyPacks,
    packsWithCanonical,
    goldenBellWithoutCanonical,
    goldenBellWithCanonical,
  }
}

export async function backfillCanonicalBooksAdmin(
  db: Firestore,
): Promise<{ created: number; linked: number; groups: number }> {
  const booksSnap = await db.collection(BOOKS).get()
  const books = booksSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BookRow)

  const groups = new Map<string, BookRow[]>()
  for (const b of books) {
    const key = editionKey(b.title, b.publisher)
    const list = groups.get(key) ?? []
    list.push(b)
    groups.set(key, list)
  }

  let created = 0
  let linked = 0
  const now = FieldValue.serverTimestamp()

  for (const [, group] of groups) {
    const seed = group.find((b) => (b.tocOutline?.length ?? 0) > 0) ?? group[0]
    const canonId = primaryCanonicalDocId(seed.title, seed.publisher)
    const eKey = editionKey(seed.title, seed.publisher)
    const canonRef = db.collection(CANONICAL).doc(canonId)
    const canonSnap = await canonRef.get()

    if (!canonSnap.exists) {
      const tocOutline = group.find((b) => b.tocOutline?.length)?.tocOutline
      const userIds = [...new Set(group.map((b) => b.user_id))]
      await canonRef.set({
        editionKey: eKey,
        ...pickBibliographic(seed),
        user_ids: userIds,
        ...(tocOutline?.length ? { tocOutline } : {}),
        created_at: now,
        updated_at: now,
      })
      created += 1
    } else {
      const existing = canonSnap.data() ?? {}
      const userIds = new Set<string>(existing.user_ids ?? [])
      for (const b of group) userIds.add(b.user_id)
      const patch: Record<string, unknown> = {
        user_ids: [...userIds],
        updated_at: now,
      }
      if (
        !(existing.tocOutline as unknown[] | undefined)?.length &&
        group.some((b) => b.tocOutline?.length)
      ) {
        patch.tocOutline = group.find((b) => b.tocOutline?.length)?.tocOutline
      }
      await canonRef.set(patch, { merge: true })
    }

    let writeBatch = db.batch()
    let batchCount = 0
    for (const b of group) {
      if (b.canonicalBookId === canonId && b.editionKey === eKey) continue
      writeBatch.update(db.collection(BOOKS).doc(b.id), {
        canonicalBookId: canonId,
        editionKey: eKey,
      })
      linked += 1
      batchCount += 1
      if (batchCount >= 400) {
        await writeBatch.commit()
        writeBatch = db.batch()
        batchCount = 0
      }
    }
    if (batchCount > 0) await writeBatch.commit()
  }

  return { created, linked, groups: groups.size }
}

export async function backfillReadingContentPacksAdmin(
  db: Firestore,
): Promise<{ migrated: number; skipped: number; merged: number }> {
  const canonSnap = await db.collection(CANONICAL).get()
  let migrated = 0
  let skipped = 0
  let merged = 0
  const now = FieldValue.serverTimestamp()

  for (const canonDoc of canonSnap.docs) {
    const canonical = canonDoc.data()
    const canonId = canonDoc.id
    const titleKey = normalizeBookTitleKey(String(canonical.title ?? ""))
    const titlePackId = titleKeyToPackDocId(titleKey)
    const canonPackRef = db.collection(PACKS).doc(canonId)
    const titlePackRef = db.collection(PACKS).doc(titlePackId)

    const [canonPackSnap, titlePackSnap] = await Promise.all([
      canonPackRef.get(),
      titlePackId === canonId ? null : titlePackRef.get(),
    ])

    const titleData =
      titlePackSnap && titlePackSnap.exists ? titlePackSnap.data() : null
    const canonData = canonPackSnap.exists ? canonPackSnap.data() : null

    if (!titleData && !canonData) {
      skipped += 1
      continue
    }

    const patch: Record<string, unknown> = {
      canonicalBookId: canonId,
      editionKey: canonical.editionKey,
      titleKey,
      bookTitleDisplay: String(canonical.title ?? "").trim(),
      updated_at: now,
    }

    if (titleData) {
      if (titleData.examAssessmentData && !canonData?.examAssessmentData) {
        patch.examAssessmentData = titleData.examAssessmentData
        merged += 1
      }
      if (
        titleData.excerptChapterSummaries &&
        !canonData?.excerptChapterSummaries
      ) {
        patch.excerptBookMetadata = titleData.excerptBookMetadata
        patch.excerptChapterSummaries = titleData.excerptChapterSummaries
        merged += 1
      }
      if (titleData.createdBy && !canonData?.createdBy) {
        patch.createdBy = titleData.createdBy
      }
    }

    if (canonData?.examAssessmentData && !patch.examAssessmentData) {
      patch.examAssessmentData = canonData.examAssessmentData
    }
    if (canonData?.excerptChapterSummaries && !patch.excerptChapterSummaries) {
      patch.excerptBookMetadata = canonData.excerptBookMetadata
      patch.excerptChapterSummaries = canonData.excerptChapterSummaries
    }

    await canonPackRef.set(patch, { merge: true })
    migrated += 1
  }

  return { migrated, skipped, merged }
}

export async function backfillGoldenBellQuizzesAdmin(
  db: Firestore,
): Promise<{ updated: number; skipped: number }> {
  const [gbSnap, booksSnap] = await Promise.all([
    db.collection(GOLDEN_BELL).get(),
    db.collection(BOOKS).get(),
  ])

  const books = booksSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BookRow)
  let updated = 0
  let skipped = 0

  for (const quizDoc of gbSnap.docs) {
    const quiz = quizDoc.data()
    if (quiz.canonicalBookId) continue

    const bookTitle = String(quiz.bookTitle ?? "").trim()
    const createdBy = String(quiz.createdBy ?? "")
    if (!bookTitle) {
      skipped += 1
      continue
    }

    const matches = books.filter(
      (b) =>
        b.title.trim() === bookTitle &&
        (!createdBy || b.user_id === createdBy),
    )
    const canonIds = [
      ...new Set(
        matches.map((b) => b.canonicalBookId).filter(Boolean) as string[],
      ),
    ]

    if (canonIds.length !== 1) {
      skipped += 1
      continue
    }

    await quizDoc.ref.update({ canonicalBookId: canonIds[0] })
    updated += 1
  }

  return { updated, skipped }
}

export async function runCanonicalBackfillAll(
  db: Firestore,
): Promise<CanonicalBackfillStepResult> {
  const scan = await scanCanonicalBackfill(db)
  const canonical = await backfillCanonicalBooksAdmin(db)
  const packs = await backfillReadingContentPacksAdmin(db)
  const goldenBell = await backfillGoldenBellQuizzesAdmin(db)
  return { scan, canonical, packs, goldenBell }
}
