import type { Book } from "@/types/book"
import type { CanonicalBook } from "@/types/canonicalBook"
import { BookService } from "@/services/bookService"
import { CanonicalBookService } from "@/services/canonicalBookService"
import { normalizeBookDuplicateKey } from "@/utils/bookTitleKey"
import { editionKeyFromBook } from "@/utils/editionKeyDocId"

export type RegisterUserBookOptions = {
  /** 탐색 등에서 같은 판본으로 확정된 경우 */
  linkToCanonicalId?: string
  /** «다른 책» 선택 시 별도 canonical 생성 */
  forceSeparateCanonical?: boolean
}

export type BookRegistrationCheck =
  | { status: "own_duplicate" }
  | { status: "needs_edition_confirm"; canonical: CanonicalBook }
  | { status: "new_edition" }
  | { status: "link_edition"; canonicalId: string }

function buildUserBookFromCanonical(
  userId: string,
  canonical: CanonicalBook,
  input: Omit<Book, "id" | "user_id">,
): Omit<Book, "id"> {
  return {
    user_id: userId,
    canonicalBookId: canonical.id,
    editionKey: canonical.editionKey,
    title: canonical.title,
    author: input.author?.trim() || canonical.author || "",
    publisher: canonical.publisher ?? input.publisher,
    publishedDate: canonical.publishedDate ?? input.publishedDate ?? "",
    status: input.status,
    rating: input.rating ?? 0,
    hasStartedReading: input.hasStartedReading,
    ...(input.toReadThisYear !== undefined
      ? { toReadThisYear: input.toReadThisYear }
      : {}),
    ...(input.level ?? canonical.level ? { level: input.level ?? canonical.level } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    ...(canonical.categoryDepth1Id
      ? {
          categoryDepth1Id: canonical.categoryDepth1Id,
          categoryDepth1Label: canonical.categoryDepth1Label,
          categoryDepth2Id: canonical.categoryDepth2Id,
          categoryDepth2Label: canonical.categoryDepth2Label,
        }
      : {
          ...(input.categoryDepth1Id
            ? {
                categoryDepth1Id: input.categoryDepth1Id,
                categoryDepth1Label: input.categoryDepth1Label,
                categoryDepth2Id: input.categoryDepth2Id,
                categoryDepth2Label: input.categoryDepth2Label,
              }
            : {}),
        }),
    ...(canonical.coverUrl ?? input.coverUrl
      ? { coverUrl: canonical.coverUrl ?? input.coverUrl }
      : {}),
    ...(canonical.isbn13 ?? input.isbn13
      ? { isbn13: canonical.isbn13 ?? input.isbn13 }
      : {}),
  }
}

export function userHasEditionInLibrary(
  userBooks: readonly Pick<Book, "title" | "publisher">[],
  title: string,
  publisher?: string,
): boolean {
  const key = normalizeBookDuplicateKey(title, publisher)
  return userBooks.some(
    (b) => normalizeBookDuplicateKey(b.title, b.publisher) === key,
  )
}

/** 탐색·다른 유저 서재에 같은 판본이 있는지 (본인 제외) */
export async function findExploreEditionRegisteredByOthers(
  userId: string,
  title: string,
  publisher?: string,
): Promise<
  | { match: true; userCount: number; title: string; publisher?: string }
  | { match: false }
> {
  const trimmed = title.trim()
  if (!trimmed) return { match: false }

  const canonical = await CanonicalBookService.findPrimaryByEdition(
    trimmed,
    publisher,
  )
  const otherUserIds =
    canonical?.user_ids.filter((registeredUserId) => registeredUserId !== userId) ??
    []
  if (!canonical || otherUserIds.length === 0) return { match: false }

  return {
    match: true,
    userCount: new Set(otherUserIds).size,
    title: canonical.title.trim() || trimmed,
    publisher: canonical.publisher?.trim() || publisher?.trim(),
  }
}

export async function findPrimaryCanonicalForRegistration(
  title: string,
  publisher?: string,
  userId?: string,
): Promise<CanonicalBook | null> {
  return resolvePrimaryCanonical(title, publisher, userId)
}

/** canonicalBooks 또는 기존 books 판본에서 primary canonical 확보 */
export async function resolvePrimaryCanonical(
  title: string,
  publisher?: string,
  userId?: string,
): Promise<CanonicalBook | null> {
  const existing = await CanonicalBookService.findPrimaryByEdition(title, publisher)
  if (existing) return existing

  if (!userId) return null
  const editionBooks = await BookService.findBooksByEditionKey(
    title,
    publisher,
    200,
    userId,
  )
  if (editionBooks.length === 0) return null

  return CanonicalBookService.createPrimaryFromExistingBooks(
    editionBooks,
    title,
    publisher,
  )
}

export async function checkBookRegistration(
  userId: string,
  userBooks: readonly Pick<Book, "title" | "publisher">[],
  input: Omit<Book, "id" | "user_id">,
  options?: { autoLinkEdition?: boolean },
): Promise<BookRegistrationCheck> {
  if (userHasEditionInLibrary(userBooks, input.title, input.publisher)) {
    return { status: "own_duplicate" }
  }

  const existing = await resolvePrimaryCanonical(
    input.title,
    input.publisher,
    userId,
  )
  if (!existing) return { status: "new_edition" }

  if (existing.user_ids.includes(userId)) {
    return { status: "own_duplicate" }
  }

  if (options?.autoLinkEdition) {
    return { status: "link_edition", canonicalId: existing.id }
  }

  return { status: "needs_edition_confirm", canonical: existing }
}

/** 유저 서재에 책 등록(신규 canonical · 기존 canonical 연결 · 별도 판본) */
/** 탐색 카드 seed → 내 서재 등록용 payload (기본: 읽고 싶은 책) */
export function buildExploreRegisterPayload(
  seed: Book,
  status: Book["status"] = "want-to-read",
): Omit<Book, "id" | "user_id"> {
  return {
    title: seed.title.trim(),
    author: seed.author?.trim() || "",
    publisher: seed.publisher?.trim(),
    publishedDate: seed.publishedDate?.trim() || "",
    status,
    rating: 0,
    hasStartedReading: status === "reading" || status === "completed",
    ...(seed.level ? { level: seed.level } : {}),
    ...(seed.categoryDepth1Id
      ? {
          categoryDepth1Id: seed.categoryDepth1Id,
          categoryDepth1Label: seed.categoryDepth1Label,
          categoryDepth2Id: seed.categoryDepth2Id,
          categoryDepth2Label: seed.categoryDepth2Label,
        }
      : {}),
    ...(seed.coverUrl?.trim() ? { coverUrl: seed.coverUrl.trim() } : {}),
    ...(seed.isbn13?.trim() ? { isbn13: seed.isbn13.trim() } : {}),
    ...(seed.notes?.trim() ? { notes: seed.notes.trim() } : {}),
  }
}

export class ExploreEditionRegisterError extends Error {
  constructor(
    message: string,
    readonly code: "duplicate" | "unknown" = "unknown",
  ) {
    super(message)
    this.name = "ExploreEditionRegisterError"
  }
}

/** 탐색 «내 책으로 추가» — 모달 없이 기존 판본 정보로 바로 등록 */
export async function registerExploreEditionBook(
  userId: string,
  seedBook: Book,
  userBooks: readonly Pick<Book, "title" | "publisher">[],
  options?: { status?: Book["status"] },
): Promise<Book> {
  const payload = buildExploreRegisterPayload(
    seedBook,
    options?.status ?? "want-to-read",
  )

  const check = await checkBookRegistration(userId, userBooks, payload, {
    autoLinkEdition: true,
  })

  if (check.status === "own_duplicate") {
    throw new ExploreEditionRegisterError(
      "이미 같은 제목·출판사로 등록된 책이 있습니다.",
      "duplicate",
    )
  }

  const registerOptions =
    check.status === "link_edition"
      ? { linkToCanonicalId: check.canonicalId }
      : undefined

  return registerUserBook(userId, payload, registerOptions)
}

export async function registerUserBook(
  userId: string,
  input: Omit<Book, "id" | "user_id">,
  options: RegisterUserBookOptions = {},
): Promise<Book> {
  const bookPayload: Omit<Book, "id"> = { ...input, user_id: userId }

  if (options.linkToCanonicalId) {
    const canonical = await CanonicalBookService.linkUser(
      options.linkToCanonicalId,
      userId,
      bookPayload,
    )
    return BookService.createBook(
      buildUserBookFromCanonical(userId, canonical, input),
    )
  }

  if (options.forceSeparateCanonical) {
    const canonical = await CanonicalBookService.createSeparateWithUser(
      userId,
      bookPayload,
    )
    return BookService.createBook(
      buildUserBookFromCanonical(userId, canonical, input),
    )
  }

  const canonical = await CanonicalBookService.createPrimaryWithUser(
    userId,
    bookPayload,
  )
  return BookService.createBook(
    buildUserBookFromCanonical(userId, canonical, input),
  )
}
