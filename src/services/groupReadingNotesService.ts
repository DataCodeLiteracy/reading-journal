import { BookService } from "@/services/bookService"
import { CritiqueService } from "@/services/critiqueService"
import { QuestionService } from "@/services/questionService"
import { QuoteService } from "@/services/quoteService"
import {
  questionFocusLabel,
  quoteHighlightLabel,
} from "@/constants/readingMeta"
import { GROUP_READING_NOTE_TYPE_LABEL } from "@/lib/groupReadingNotesConstants"
import type { Book } from "@/types/book"
import type {
  GroupBook,
  GroupMember,
  GroupReadingNoteItem,
  MeetingBookAssignment,
} from "@/types/readingGroup"

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date(0)
}

function memberLabel(member: GroupMember): string {
  return member.display_name?.trim() || "모임원"
}

function isVisible(
  isPublic: boolean,
  ownerUserId: string,
  viewerUserId: string,
): boolean {
  return isPublic || ownerUserId === viewerUserId
}

async function notesForMemberBooks(
  member: GroupMember,
  matchingBooks: Book[],
  groupBookByCanonical: Map<string, GroupBook>,
  bookToMeeting: Map<string, string>,
  viewerUserId: string,
): Promise<GroupReadingNoteItem[]> {
  const userId = member.user_id!
  const displayName = memberLabel(member)
  const items: GroupReadingNoteItem[] = []

  await Promise.all(
    matchingBooks.map(async (book) => {
      const groupBook = book.canonicalBookId
        ? groupBookByCanonical.get(book.canonicalBookId)
        : undefined
      if (!groupBook) return

      const meetingId = bookToMeeting.get(groupBook.id)
      const base = `/book/${book.id}/${userId}`

      const [quotes, questions, critiques] = await Promise.all([
        QuoteService.getBookQuotes(book.id),
        QuestionService.getBookQuestions(book.id),
        CritiqueService.getBookCritiques(book.id),
      ])

      quotes.forEach((quote) => {
        if (!isVisible(Boolean(quote.isPublic), userId, viewerUserId)) return
        const kindLabel = quoteHighlightLabel(quote.highlightKind)
        items.push({
          id: `quote:${quote.id}`,
          recordType: "quote",
          badgeLabel: kindLabel || GROUP_READING_NOTE_TYPE_LABEL.quote,
          userId,
          displayName,
          groupBookId: groupBook.id,
          canonicalBookId: groupBook.canonical_book_id,
          bookTitle: book.title,
          personalBookId: book.id,
          meetingId,
          title: "구절",
          excerpt: quote.quoteText,
          isPublic: Boolean(quote.isPublic),
          createdAt: toDate(quote.created_at),
          detailHref: `${base}/quotes/${quote.id}`,
        })
      })

      questions.forEach((question) => {
        if (!isVisible(Boolean(question.isPublic), userId, viewerUserId)) return
        const focusLabel = questionFocusLabel(question.questionFocus)
        items.push({
          id: `question:${question.id}`,
          recordType: "question",
          badgeLabel: focusLabel || GROUP_READING_NOTE_TYPE_LABEL.question,
          userId,
          displayName,
          groupBookId: groupBook.id,
          canonicalBookId: groupBook.canonical_book_id,
          bookTitle: book.title,
          personalBookId: book.id,
          meetingId,
          title: "질문",
          excerpt: question.questionText,
          isPublic: Boolean(question.isPublic),
          createdAt: toDate(question.created_at),
          detailHref: `${base}/questions/${question.id}`,
        })
      })

      critiques.forEach((critique) => {
        if (!isVisible(Boolean(critique.isPublic), userId, viewerUserId)) return
        items.push({
          id: `critique:${critique.id}`,
          recordType: "critique",
          badgeLabel: GROUP_READING_NOTE_TYPE_LABEL.critique,
          userId,
          displayName,
          groupBookId: groupBook.id,
          canonicalBookId: groupBook.canonical_book_id,
          bookTitle: book.title,
          personalBookId: book.id,
          meetingId,
          title: critique.title?.trim() || "서평",
          excerpt: critique.content,
          isPublic: Boolean(critique.isPublic),
          createdAt: toDate(critique.created_at),
          detailHref: `${base}/critiques/${critique.id}`,
        })
      })

      if (
        book.review?.trim() &&
        isVisible(Boolean(book.reviewIsPublic), userId, viewerUserId)
      ) {
        items.push({
          id: `review:${book.id}`,
          recordType: "review",
          badgeLabel: GROUP_READING_NOTE_TYPE_LABEL.review,
          userId,
          displayName,
          groupBookId: groupBook.id,
          canonicalBookId: groupBook.canonical_book_id,
          bookTitle: book.title,
          personalBookId: book.id,
          meetingId,
          title: "독서 리뷰",
          excerpt: book.review.trim(),
          isPublic: Boolean(book.reviewIsPublic),
          createdAt: toDate(book.updated_at ?? book.created_at),
          detailHref: `${base}/review`,
        })
      }
    }),
  )

  return items
}

export class GroupReadingNotesService {
  static async getGroupReadingNotes(input: {
    members: GroupMember[]
    books: GroupBook[]
    assignments: MeetingBookAssignment[]
    viewerUserId: string
  }): Promise<GroupReadingNoteItem[]> {
    const { members, books, assignments, viewerUserId } = input
    const groupBookByCanonical = new Map(
      books.map((book) => [book.canonical_book_id, book]),
    )
    const canonicalIds = new Set(books.map((book) => book.canonical_book_id))
    const bookToMeeting = new Map<string, string>()
    assignments.forEach((assignment) => {
      bookToMeeting.set(assignment.group_book_id, assignment.meeting_id)
    })

    const activeMembers = members.filter(
      (member) => member.status === "active" && member.user_id,
    )

    const memberResults = await Promise.all(
      activeMembers.map(async (member) => {
        const userBooks = await BookService.getUserBooks(member.user_id!)
        const matchingBooks = userBooks.filter(
          (book) =>
            book.canonicalBookId && canonicalIds.has(book.canonicalBookId),
        )
        return notesForMemberBooks(
          member,
          matchingBooks,
          groupBookByCanonical,
          bookToMeeting,
          viewerUserId,
        )
      }),
    )

    return memberResults
      .flat()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}
