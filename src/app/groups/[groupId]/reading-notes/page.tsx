"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, NotebookPen, Plus } from "lucide-react"
import CritiqueModal from "@/components/CritiqueModal"
import FormModalFrame from "@/components/FormModalFrame"
import Pagination from "@/components/Pagination"
import QuestionAddModal from "@/components/QuestionAddModal"
import QuoteModal from "@/components/QuoteModal"
import ReviewModal from "@/components/ReviewModal"
import Select, { type SelectOption } from "@/components/Select"
import GroupReadingNoteCard from "@/components/reading-groups/GroupReadingNoteCard"
import { useAuth } from "@/contexts/AuthContext"
import type { GroupReadingNotesSort } from "@/lib/groupReadingNotesAdmin"
import {
  GROUP_READING_NOTE_TYPE_LABEL,
  GROUP_READING_NOTE_TYPES,
  GROUP_READING_NOTES_PAGE_SIZE,
} from "@/lib/groupReadingNotesConstants"
import { queryKeys } from "@/lib/queryKeys"
import { BookService } from "@/services/bookService"
import { CanonicalBookService } from "@/services/canonicalBookService"
import { registerUserBook } from "@/services/bookRegistrationService"
import { CritiqueService } from "@/services/critiqueService"
import { GroupReadingNotesApiService } from "@/services/groupReadingNotesApiService"
import { QuestionService } from "@/services/questionService"
import { QuoteService } from "@/services/quoteService"
import { ReadingGroupService } from "@/services/readingGroupService"
import { UserService } from "@/services/userService"
import type { Book } from "@/types/book"
import type { GroupBook, GroupReadingNoteType } from "@/types/readingGroup"

type SortKey = GroupReadingNotesSort

function isNoteType(value: string | null): value is GroupReadingNoteType {
  return (
    value === "quote" ||
    value === "question" ||
    value === "review" ||
    value === "critique"
  )
}

function meetingLabel(sequence: number, title: string) {
  return `${sequence}회 · ${title}`
}

/** 필터 Select용: "본제 - 부제"에서 부제 생략 */
function shortBookTitle(title: string) {
  const dashIndex = title.indexOf(" - ")
  if (dashIndex === -1) return title
  const short = title.slice(0, dashIndex).trim()
  return short || title
}

const FAB_LABEL: Record<GroupReadingNoteType, string> = {
  quote: "구절 남기기",
  question: "질문 남기기",
  review: "리뷰 남기기",
  critique: "서평 남기기",
}

export default function GroupReadingNotesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams<{ groupId: string }>()
  const searchParams = useSearchParams()
  const groupId = params.groupId
  const { isLoggedIn, loading, userUid } = useAuth()

  const typeParam = searchParams.get("type")
  const initialType: GroupReadingNoteType = isNoteType(typeParam)
    ? typeParam
    : "quote"
  const initialMeeting = searchParams.get("meeting") ?? ""
  const initialBook = searchParams.get("book") ?? ""
  const initialMember = searchParams.get("member") ?? ""

  const [activeType, setActiveType] = useState<GroupReadingNoteType>(initialType)
  const [loadedTypes, setLoadedTypes] = useState<Set<GroupReadingNoteType>>(
    () => new Set([initialType]),
  )
  const [meetingFilter, setMeetingFilter] = useState(initialMeeting)
  const [bookFilter, setBookFilter] = useState(initialBook)
  const [memberFilter, setMemberFilter] = useState(initialMember)
  const [sortKey, setSortKey] = useState<SortKey>("newest")
  const [currentPage, setCurrentPage] = useState(1)

  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [critiqueModalOpen, setCritiqueModalOpen] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [targetBook, setTargetBook] = useState<Book | null>(null)
  const [fabBusy, setFabBusy] = useState(false)
  const [fabError, setFabError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login")
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    const typeParam = searchParams.get("type")
    if (isNoteType(typeParam)) {
      setActiveType(typeParam)
      setLoadedTypes((prev) => new Set(prev).add(typeParam))
    }
    setMeetingFilter(searchParams.get("meeting") ?? "")
    setBookFilter(searchParams.get("book") ?? "")
    setMemberFilter(searchParams.get("member") ?? "")
  }, [searchParams])

  const detailQuery = useQuery({
    queryKey: [...queryKeys.readingGroups.notesContext(groupId), userUid],
    enabled: Boolean(groupId && userUid),
    queryFn: async () => {
      const [group, membership] = await Promise.all([
        ReadingGroupService.getGroup(groupId),
        ReadingGroupService.getMember(`${groupId}__${userUid}`),
      ])
      if (!group) throw new Error("독서모임을 찾을 수 없습니다.")
      if (!membership || membership.status !== "active") {
        throw new Error("이 독서모임을 볼 수 있는 활동 멤버가 아닙니다.")
      }
      const [members, books, meetings, assignments] = await Promise.all([
        ReadingGroupService.getGroupMembers(groupId),
        ReadingGroupService.getGroupBooks(groupId),
        ReadingGroupService.getGroupMeetings(groupId),
        ReadingGroupService.getGroupMeetingBookAssignments(groupId),
      ])
      return { group, membership, members, books, meetings, assignments }
    },
  })

  const filterKey = [
    meetingFilter,
    bookFilter,
    memberFilter,
  ].join(":")

  useEffect(() => {
    setCurrentPage(1)
  }, [activeType, filterKey, sortKey])

  const notesQuery = useQuery({
    queryKey: queryKeys.readingGroups.readingNotesPage(
      groupId,
      activeType,
      filterKey,
      sortKey,
      currentPage,
    ),
    queryFn: () =>
      GroupReadingNotesApiService.fetchPage(groupId, {
        recordType: activeType,
        page: currentPage,
        pageSize: GROUP_READING_NOTES_PAGE_SIZE,
        filters: {
          meetingId: meetingFilter || undefined,
          groupBookId: bookFilter || undefined,
          memberUserId: memberFilter || undefined,
        },
        sort: sortKey,
      }),
    enabled: Boolean(groupId && userUid && loadedTypes.has(activeType)),
  })

  const activeMembers = useMemo(
    () =>
      (detailQuery.data?.members ?? []).filter(
        (member) => member.status === "active" && member.user_id,
      ),
    [detailQuery.data?.members],
  )

  const activeMemberUserIds = useMemo(
    () =>
      activeMembers
        .map((member) => member.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    [activeMembers],
  )

  const [userDisplayNames, setUserDisplayNames] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    let cancelled = false
    if (!activeMemberUserIds.length) {
      setUserDisplayNames({})
      return
    }
    void Promise.all(
      activeMemberUserIds.map(async (userId) => {
        const user = await UserService.getUser(userId)
        return [userId, user?.displayName?.trim() || ""] as const
      }),
    )
      .then((entries) => {
        if (cancelled) return
        setUserDisplayNames(
          Object.fromEntries(
            entries.filter(([, displayName]) => Boolean(displayName)),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setUserDisplayNames({})
      })
    return () => {
      cancelled = true
    }
  }, [activeMemberUserIds])

  const meetingOptions = useMemo<SelectOption<string>[]>(() => {
    const assignments = detailQuery.data?.assignments ?? []
    const meetings = detailQuery.data?.meetings ?? []
    const meetingIds = new Set(assignments.map((item) => item.meeting_id))
    const ordered = [...meetings]
      .filter((meeting) => meetingIds.has(meeting.id))
      .sort((a, b) => a.sequence - b.sequence)
    return [
      { value: "", label: "전체 회차" },
      ...ordered.map((meeting) => ({
        value: meeting.id,
        label: meetingLabel(meeting.sequence, meeting.title),
      })),
    ]
  }, [detailQuery.data?.assignments, detailQuery.data?.meetings])

  const bookOptions = useMemo<SelectOption<string>[]>(() => {
    const assignments = detailQuery.data?.assignments ?? []
    const books = detailQuery.data?.books ?? []
    const scopedAssignments = meetingFilter
      ? assignments.filter((item) => item.meeting_id === meetingFilter)
      : assignments
    const bookIds = new Set(scopedAssignments.map((item) => item.group_book_id))
    const scopedBooks = books.filter((book) => bookIds.has(book.id))
    return [
      { value: "", label: "전체 책" },
      ...scopedBooks.map((book) => ({
        value: book.id,
        label: shortBookTitle(book.title),
      })),
    ]
  }, [detailQuery.data?.assignments, detailQuery.data?.books, meetingFilter])

  const memberOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "전체 모임원" },
      ...activeMembers.map((member) => ({
        value: member.user_id!,
        label:
          (member.user_id ? userDisplayNames[member.user_id] : "") ||
          member.display_name?.trim() ||
          "모임원",
      })),
    ],
    [activeMembers, userDisplayNames],
  )

  const sortOptions: SelectOption<SortKey>[] = [
    { value: "newest", label: "최신순" },
    { value: "oldest", label: "오래된순" },
    { value: "member", label: "모임원 이름순" },
    { value: "type", label: "유형순" },
  ]

  const handleMeetingChange = (value: string) => {
    setMeetingFilter(value)
    if (bookFilter) {
      const stillValid = (detailQuery.data?.assignments ?? []).some(
        (item) =>
          item.group_book_id === bookFilter &&
          (!value || item.meeting_id === value),
      )
      if (!stillValid) setBookFilter("")
    }
  }

  const handleTypeChange = (type: GroupReadingNoteType) => {
    setActiveType(type)
    setLoadedTypes((prev) => new Set(prev).add(type))
  }

  const userBooksQuery = useQuery({
    queryKey: queryKeys.user.books(userUid),
    queryFn: () => BookService.getUserBooks(userUid!),
    enabled: Boolean(userUid),
  })

  const booksByCanonical = useMemo(() => {
    const map = new Map<string, Book>()
    for (const book of userBooksQuery.data ?? []) {
      if (book.canonicalBookId && !map.has(book.canonicalBookId)) {
        map.set(book.canonicalBookId, book)
      }
    }
    return map
  }, [userBooksQuery.data])

  const pickerBooks = useMemo(() => {
    const books = detailQuery.data?.books ?? []
    const assignments = detailQuery.data?.assignments ?? []
    if (!meetingFilter) return books
    const bookIds = new Set(
      assignments
        .filter((item) => item.meeting_id === meetingFilter)
        .map((item) => item.group_book_id),
    )
    return books.filter((book) => bookIds.has(book.id))
  }, [
    detailQuery.data?.books,
    detailQuery.data?.assignments,
    meetingFilter,
  ])

  const refreshNotes = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["readingGroups", groupId, "readingNotes"],
    })
  }

  const openCreateForPersonalBook = async (
    personalBook: Book,
    canonicalBookId?: string,
  ) => {
    let bookWithToc = personalBook
    if (!(personalBook.tocOutline?.length ?? 0)) {
      const cid = personalBook.canonicalBookId || canonicalBookId
      if (cid) {
        const canonical = await CanonicalBookService.getById(cid)
        if (canonical?.tocOutline?.length) {
          bookWithToc = {
            ...personalBook,
            tocOutline: canonical.tocOutline,
            canonicalBookId: personalBook.canonicalBookId || canonical.id,
          }
        }
      } else {
        const refreshed = await BookService.getBook(personalBook.id)
        if (refreshed?.tocOutline?.length) bookWithToc = refreshed
      }
    }

    setTargetBook(bookWithToc)
    setFabError(null)
    if (activeType === "quote") setQuoteModalOpen(true)
    else if (activeType === "question") setQuestionModalOpen(true)
    else if (activeType === "critique") setCritiqueModalOpen(true)
    else setReviewModalOpen(true)
  }

  const ensurePersonalBook = async (groupBook: GroupBook): Promise<Book> => {
    const existing = booksByCanonical.get(groupBook.canonical_book_id)
    if (existing) return existing

    const canonical = await CanonicalBookService.getById(
      groupBook.canonical_book_id,
    )
    if (!canonical) throw new Error("공유 판본 정보를 찾을 수 없습니다.")

    const created = await registerUserBook(
      userUid!,
      {
        title: canonical.title,
        author: canonical.author || "",
        publisher: canonical.publisher,
        publishedDate: canonical.publishedDate || "",
        status: "want-to-read",
        rating: 0,
        hasStartedReading: false,
        coverUrl: canonical.coverUrl,
        isbn13: canonical.isbn13,
        level: canonical.level,
        categoryDepth1Id: canonical.categoryDepth1Id,
        categoryDepth1Label: canonical.categoryDepth1Label,
        categoryDepth2Id: canonical.categoryDepth2Id,
        categoryDepth2Label: canonical.categoryDepth2Label,
      },
      { linkToCanonicalId: canonical.id },
    )
    await userBooksQuery.refetch()
    return created.tocOutline?.length
      ? created
      : {
          ...created,
          ...(canonical.tocOutline?.length
            ? { tocOutline: canonical.tocOutline }
            : {}),
        }
  }

  const startCreateForGroupBook = async (groupBook: GroupBook) => {
    if (!userUid) return
    setFabBusy(true)
    setFabError(null)
    try {
      const personalBook = await ensurePersonalBook(groupBook)
      setBookPickerOpen(false)
      await openCreateForPersonalBook(
        personalBook,
        groupBook.canonical_book_id,
      )
    } catch (error) {
      setFabError(
        error instanceof Error
          ? error.message
          : "기록을 시작할 수 없습니다.",
      )
    } finally {
      setFabBusy(false)
    }
  }

  const handleFabClick = () => {
    setFabError(null)
    if (bookFilter) {
      const groupBook = (detailQuery.data?.books ?? []).find(
        (book) => book.id === bookFilter,
      )
      if (!groupBook) {
        setFabError("선택한 책을 찾을 수 없습니다.")
        return
      }
      void startCreateForGroupBook(groupBook)
      return
    }
    if (pickerBooks.length === 1) {
      void startCreateForGroupBook(pickerBooks[0])
      return
    }
    setBookPickerOpen(true)
  }

  if (loading || detailQuery.isLoading) {
    return (
      <main className="min-h-screen bg-theme-gradient pb-24">
        <div className="container mx-auto max-w-4xl animate-pulse px-3 py-4 sm:px-4 sm:py-6">
          <div className="mb-4 h-5 w-28 rounded bg-theme-tertiary" />
          <div className="mb-4 h-24 rounded-xl bg-theme-tertiary" />
          <div className="h-64 rounded-xl bg-theme-tertiary" />
        </div>
      </main>
    )
  }

  if (!isLoggedIn || !userUid) return null

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <main className="min-h-screen bg-theme-gradient pb-24">
        <div className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold text-theme-primary">
            독서 노트를 열 수 없습니다
          </h1>
          <p className="mb-5 text-sm text-theme-secondary" role="alert">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "독서모임 정보를 불러오지 못했습니다."}
          </p>
          <Link
            href={`/groups/${groupId}`}
            className="inline-flex rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white"
          >
            모임으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  const { group } = detailQuery.data
  const totalItems = notesQuery.data?.total ?? 0
  const totalPages = notesQuery.data?.totalPages ?? 1
  const fabHidden =
    bookPickerOpen ||
    quoteModalOpen ||
    questionModalOpen ||
    critiqueModalOpen ||
    reviewModalOpen

  return (
    <main className="min-h-screen bg-theme-gradient pb-20 sm:pb-24">
      <div className="container mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6">
        <Link
          href={`/groups/${groupId}?tab=records`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-theme-secondary hover:text-theme-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {group.name}
        </Link>

        <header className="mb-4 rounded-xl border-card bg-theme-secondary p-4 shadow-sm sm:mb-5 sm:p-5">
          <div className="flex items-start gap-2">
            <NotebookPen
              className="mt-0.5 h-5 w-5 shrink-0 text-accent-theme"
              aria-hidden
            />
            <div>
              <h1 className="text-xl font-bold text-theme-primary sm:text-2xl">
                독서 노트
              </h1>
              <p className="mt-1 text-sm text-theme-secondary">
                모임원이 같은 책에 남긴 구절·질문·리뷰·서평을 함께 볼 수 있어요.
                비공개 기록은 작성자 본인에게만 보입니다.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-xl border-card bg-theme-secondary p-3 shadow-sm sm:p-5">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={meetingFilter}
              onChangeAction={handleMeetingChange}
              options={meetingOptions}
              aria-label="회차 필터"
              variant="toolbar"
            />
            <Select
              value={bookFilter}
              onChangeAction={setBookFilter}
              options={bookOptions}
              aria-label="책 필터"
              variant="toolbar"
            />
            <Select
              value={memberFilter}
              onChangeAction={setMemberFilter}
              options={memberOptions}
              aria-label="모임원 필터"
              variant="toolbar"
            />
            <Select
              value={sortKey}
              onChangeAction={setSortKey}
              options={sortOptions}
              aria-label="정렬"
              variant="toolbar"
            />
          </div>

          <div
            className="mt-4 grid grid-cols-4 overflow-hidden rounded-lg bg-theme-tertiary p-1"
            role="tablist"
            aria-label="기록 유형"
          >
            {GROUP_READING_NOTE_TYPES.map((type) => {
              const selected = activeType === type
              return (
                <button
                  key={type}
                  id={`reading-notes-${type}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="reading-notes-panel"
                  onClick={() => handleTypeChange(type)}
                  className={`rounded-md px-1 py-2 text-[11px] font-semibold sm:text-sm ${
                    selected
                      ? "bg-theme-secondary text-theme-primary shadow-sm"
                      : "text-theme-secondary"
                  }`}
                >
                  {GROUP_READING_NOTE_TYPE_LABEL[type]}
                </button>
              )
            })}
          </div>

          <div
            id="reading-notes-panel"
            role="tabpanel"
            aria-labelledby={`reading-notes-${activeType}-tab`}
            className="mt-4"
          >
            {!loadedTypes.has(activeType) ? (
              <p className="rounded-lg border border-dashed border-theme-tertiary p-5 text-center text-sm text-theme-secondary">
                탭을 선택하면 기록을 불러옵니다.
              </p>
            ) : notesQuery.isLoading ? (
              <p className="rounded-lg border border-dashed border-theme-tertiary p-5 text-center text-sm text-theme-secondary">
                {GROUP_READING_NOTE_TYPE_LABEL[activeType]} 기록을 불러오는 중…
              </p>
            ) : notesQuery.isError ? (
              <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                기록을 불러오지 못했습니다.
              </p>
            ) : (notesQuery.data?.items.length ?? 0) === 0 ? (
              <p className="rounded-lg border border-dashed border-theme-tertiary p-5 text-center text-sm text-theme-secondary">
                {GROUP_READING_NOTE_TYPE_LABEL[activeType]} 기록이 없습니다.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {notesQuery.data!.items.map((item) => (
                      <GroupReadingNoteCard
                        key={item.id}
                        item={item}
                        viewerUserId={userUid}
                        member={activeMembers.find(
                          (member) => member.user_id === item.userId,
                        )}
                      />
                  ))}
                </ul>
                {totalPages > 1 ? (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      totalItems={totalItems}
                      itemsPerPage={GROUP_READING_NOTES_PAGE_SIZE}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>

      {fabError && !fabHidden ? (
        <p
          className="fixed bottom-[calc(4.5rem+30px+2.75rem+0.5rem+env(safe-area-inset-bottom,0px))] left-3 right-20 z-[55] rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm dark:bg-red-950/40 dark:text-red-300 sm:left-auto sm:right-24 sm:max-w-xs"
          role="alert"
        >
          {fabError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleFabClick}
        disabled={fabBusy || fabHidden}
        tabIndex={fabHidden ? -1 : 0}
        aria-hidden={fabHidden}
        className={`fixed bottom-[calc(4.5rem+30px+env(safe-area-inset-bottom,0px))] right-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-white shadow-md transition-[opacity,transform] ease-out dark:bg-slate-100 dark:text-slate-900 sm:right-6 ${
          fabHidden
            ? "pointer-events-none translate-y-2 scale-90 opacity-0 duration-[600ms]"
            : fabBusy
              ? "translate-y-0 scale-100 opacity-60 duration-[1300ms]"
              : "translate-y-0 scale-100 opacity-100 duration-[1300ms] hover:opacity-90"
        }`}
        aria-label={FAB_LABEL[activeType]}
      >
        <Plus className="h-5 w-5" aria-hidden strokeWidth={2.5} />
      </button>

      <FormModalFrame
        isOpen={bookPickerOpen}
        onClose={() => {
          if (!fabBusy) setBookPickerOpen(false)
        }}
        title={`${FAB_LABEL[activeType]} · 책 선택`}
        interactionLocked={fabBusy}
      >
        {pickerBooks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-theme-tertiary p-4 text-center text-sm text-theme-secondary">
            선택할 수 있는 모임 책이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {pickerBooks.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  disabled={fabBusy}
                  onClick={() => void startCreateForGroupBook(book)}
                  className="flex w-full items-start gap-3 rounded-lg border border-theme-tertiary bg-theme-tertiary/40 px-3 py-3 text-left transition-colors hover:bg-theme-tertiary disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-theme-primary">{book.title}</p>
                    <p className="mt-0.5 truncate text-xs text-theme-secondary">
                      {book.author || "저자 미상"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </FormModalFrame>

      {targetBook ? (
        <>
          <QuoteModal
            isOpen={quoteModalOpen}
            onClose={() => {
              setQuoteModalOpen(false)
              setTargetBook(null)
            }}
            onSave={async (quoteData) => {
              if (!userUid || !targetBook) return
              await QuoteService.createQuote({
                ...quoteData,
                user_id: userUid,
              })
              setQuoteModalOpen(false)
              setTargetBook(null)
              await refreshNotes()
            }}
            bookId={targetBook.id}
            bookTitle={targetBook.title}
            tocOutline={targetBook.tocOutline}
          />
          <QuestionAddModal
            isOpen={questionModalOpen}
            onClose={() => {
              setQuestionModalOpen(false)
              setTargetBook(null)
            }}
            onSave={async (questionData) => {
              if (!userUid || !targetBook) return
              const existing = await QuestionService.getBookQuestions(
                targetBook.id,
              )
              const maxOrder =
                existing.length > 0
                  ? Math.max(...existing.map((q) => q.order ?? 0))
                  : 0
              await QuestionService.createQuestion({
                ...questionData,
                user_id: userUid,
                bookId: targetBook.id,
                order: maxOrder + 1,
              })
              setQuestionModalOpen(false)
              setTargetBook(null)
              await refreshNotes()
            }}
            bookId={targetBook.id}
            tocOutline={targetBook.tocOutline}
          />
          <CritiqueModal
            isOpen={critiqueModalOpen}
            onClose={() => {
              setCritiqueModalOpen(false)
              setTargetBook(null)
            }}
            onSave={async (critiqueData) => {
              if (!userUid || !targetBook) return
              await CritiqueService.createCritique({
                ...critiqueData,
                user_id: userUid,
                bookId: targetBook.id,
              })
              setCritiqueModalOpen(false)
              setTargetBook(null)
              await refreshNotes()
            }}
            bookId={targetBook.id}
            bookTitle={targetBook.title}
          />
          <ReviewModal
            isOpen={reviewModalOpen}
            onClose={() => {
              setReviewModalOpen(false)
              setTargetBook(null)
            }}
            onSave={async (data) => {
              if (!userUid || !targetBook) return
              const reviewChanged =
                data.review.trim() !== (targetBook.review || "").trim()
              const clearAiIfReviewEdited =
                targetBook.reviewAiGradedAt && reviewChanged
                  ? {
                      reviewAiScore: undefined,
                      reviewAiFeedback: undefined,
                      reviewAiGradedAt: undefined,
                    }
                  : {}
              await BookService.updateBook(targetBook.id, {
                ...targetBook,
                rating: data.rating,
                review: data.review,
                reviewIsPublic: data.reviewIsPublic,
                ...clearAiIfReviewEdited,
              })
              await userBooksQuery.refetch()
              setReviewModalOpen(false)
              setTargetBook(null)
              await refreshNotes()
            }}
            bookTitle={targetBook.title}
            initialReview={targetBook.review || ""}
            initialRating={targetBook.rating || 0}
            initialIsPublic={
              targetBook.review?.trim()
                ? Boolean(targetBook.reviewIsPublic)
                : true
            }
          />
        </>
      ) : null}
    </main>
  )
}
