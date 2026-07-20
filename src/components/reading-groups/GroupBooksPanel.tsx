"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, CalendarDays, Pencil, Plus, Search, Trash2 } from "lucide-react"
import AddBookModal from "@/components/AddBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import FormModalFrame from "@/components/FormModalFrame"
import Select, { type SelectOption } from "@/components/Select"
import { BookService } from "@/services/bookService"
import { CanonicalBookService } from "@/services/canonicalBookService"
import {
  checkBookRegistration,
  registerUserBook,
  resolvePrimaryCanonical,
} from "@/services/bookRegistrationService"
import { ReadingGroupService } from "@/services/readingGroupService"
import { ReadingSessionService } from "@/services/readingSessionService"
import type { Book } from "@/types/book"
import type { CanonicalBook } from "@/types/canonicalBook"
import type {
  GroupBook,
  GroupBookStatus,
  GroupMeeting,
  MeetingBookAssignment,
  UpdateGroupBookInput,
} from "@/types/readingGroup"
import { normalizeBookDuplicateKey } from "@/utils/bookTitleKey"
import {
  groupDateKey,
  inclusiveReadingDateRange,
} from "@/utils/readingGroupDates"
import { resolveMemberKind } from "@/utils/groupMemberLabels"
import { groupReadingNotesPath } from "@/utils/groupReadingNotesUrl"

type Props = {
  groupId: string
  books: GroupBook[]
  meetings: GroupMeeting[]
  assignments: MeetingBookAssignment[]
  timeZone: string
  isOwner: boolean
  userUid: string
  memberKind?: "participant" | "guardian"
  onChangedAction: () => void | Promise<unknown>
}

type GroupBookDraft = {
  selected_reason: string
}

const STATUS_SECTIONS: Array<{
  status: GroupBookStatus
  label: string
}> = [
  { status: "planned", label: "예정" },
  { status: "on_hold", label: "선정 보류" },
  { status: "reading", label: "읽는 중" },
  { status: "reading_paused", label: "정지" },
  { status: "completed", label: "완료" },
  { status: "paused", label: "중단" },
]
const STATUS_OPTIONS: SelectOption<GroupBookStatus>[] = STATUS_SECTIONS.map(
  ({ status, label }) => ({ value: status, label }),
)

const EMPTY_DRAFT: GroupBookDraft = {
  selected_reason: "",
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function GroupFields({
  value,
  onChange,
  idPrefix,
}: {
  value: GroupBookDraft
  onChange: (value: GroupBookDraft) => void
  idPrefix: string
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-reason`} className="mb-1 block text-sm font-medium text-theme-primary">
          선정 이유
        </label>
        <textarea
          id={`${idPrefix}-reason`}
          value={value.selected_reason}
          onChange={(event) =>
            onChange({ ...value, selected_reason: event.target.value })
          }
          rows={3}
          className="form-control form-control-textarea"
          placeholder="이 책을 함께 읽는 이유를 적어 주세요."
        />
      </div>
    </div>
  )
}

export default function GroupBooksPanel({
  groupId,
  books,
  meetings,
  assignments,
  timeZone,
  isOwner,
  userUid,
  memberKind,
  onChangedAction,
}: Props) {
  const router = useRouter()
  const isGuardian = resolveMemberKind({ member_kind: memberKind }) === "guardian"
  const goReadLabel = isGuardian ? "자녀 읽어주러 가기" : "타이머 시작하러 가기"
  const goReadConfirmText = isGuardian ? "읽어주러 가기" : "책 상세로 이동"
  const [addOpen, setAddOpen] = useState(false)
  const [newBookOpen, setNewBookOpen] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<CanonicalBook[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [draft, setDraft] = useState<GroupBookDraft>(EMPTY_DRAFT)
  const [selectedCanonicals, setSelectedCanonicals] = useState<CanonicalBook[]>(
    [],
  )
  const [editing, setEditing] = useState<GroupBook | null>(null)
  const [editDraft, setEditDraft] = useState<GroupBookDraft>(EMPTY_DRAFT)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [prePeriodTimerTarget, setPrePeriodTimerTarget] = useState<{
    href: string
    title: string
  } | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const userBooksQuery = useQuery({
    queryKey: ["group-books", "user-library", userUid],
    queryFn: () => BookService.getUserBooks(userUid),
    enabled: Boolean(userUid),
  })
  const userBooks = userBooksQuery.data ?? []
  const booksByCanonical = useMemo(
    () =>
      new Map(
        userBooks
          .filter((book) => book.canonicalBookId)
          .map((book) => [book.canonicalBookId!, book]),
      ),
    [userBooks],
  )
  const duplicateKeys = useMemo(
    () =>
      userBooks.map((book) =>
        normalizeBookDuplicateKey(book.title, book.publisher),
      ),
    [userBooks],
  )
  const existingCanonicalIds = useMemo(
    () => new Set(books.map((book) => book.canonical_book_id)),
    [books],
  )

  const refresh = async () => {
    await Promise.all([onChangedAction(), userBooksQuery.refetch()])
  }

  const createGroupBook = async (
    canonical: CanonicalBook,
    groupDraft: GroupBookDraft,
    options?: { refreshAfter?: boolean },
  ) => {
    if (existingCanonicalIds.has(canonical.id)) {
      throw new Error("이미 모임 책장에 등록된 판본입니다.")
    }
    await ReadingGroupService.createGroupBook(groupId, {
      canonical_book_id: canonical.id,
      title: canonical.title,
      author: canonical.author,
      cover_url: canonical.coverUrl,
      selected_reason: groupDraft.selected_reason.trim() || undefined,
    })
    if (options?.refreshAfter !== false) {
      await refresh()
    }
  }

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchText.trim()
    setHasSearched(Boolean(query))
    setSearchResults([])
    setPanelError(null)
    if (!query) return

    setIsSearching(true)
    try {
      setSearchResults(await CanonicalBookService.searchByTitlePrefix(query))
    } catch (error) {
      setPanelError(errorMessage(error, "공유 판본을 검색하지 못했습니다."))
    } finally {
      setIsSearching(false)
    }
  }

  const toggleCanonical = (canonical: CanonicalBook) => {
    setSelectedCanonicals((current) =>
      current.some((item) => item.id === canonical.id)
        ? current.filter((item) => item.id !== canonical.id)
        : [...current, canonical],
    )
  }

  const addSelectedCanonicals = async () => {
    const toAdd = selectedCanonicals.filter(
      (canonical) => !existingCanonicalIds.has(canonical.id),
    )
    if (toAdd.length === 0) {
      setPanelError("추가할 책을 한 권 이상 선택해 주세요.")
      return
    }

    setBusyId("batch-add")
    setPanelError(null)
    try {
      for (const canonical of toAdd) {
        await createGroupBook(canonical, draft, { refreshAfter: false })
      }
      await refresh()
      setAddOpen(false)
      setSelectedCanonicals([])
      setDraft(EMPTY_DRAFT)
      setSearchText("")
      setSearchResults([])
      setHasSearched(false)
    } catch (error) {
      await refresh()
      setPanelError(errorMessage(error, "모임 책을 추가하지 못했습니다."))
    } finally {
      setBusyId(null)
    }
  }

  const addNewBookToLibraryAndGroup = async (
    input: Omit<Book, "id" | "user_id">,
  ) => {
    const latestBooks = await BookService.getUserBooks(userUid)
    const check = await checkBookRegistration(userUid, latestBooks, input, {
      autoLinkEdition: true,
    })

    let canonical: CanonicalBook | null = null
    if (check.status === "own_duplicate") {
      const key = normalizeBookDuplicateKey(input.title, input.publisher)
      const ownBook = latestBooks.find(
        (book) => normalizeBookDuplicateKey(book.title, book.publisher) === key,
      )
      canonical = ownBook?.canonicalBookId
        ? await CanonicalBookService.getById(ownBook.canonicalBookId)
        : await resolvePrimaryCanonical(input.title, input.publisher, userUid)
    } else {
      const created = await registerUserBook(
        userUid,
        input,
        check.status === "link_edition"
          ? { linkToCanonicalId: check.canonicalId }
          : undefined,
      )
      canonical = created.canonicalBookId
        ? await CanonicalBookService.getById(created.canonicalBookId)
        : null
    }

    if (!canonical) {
      throw new Error("등록된 책의 공유 판본 정보를 확인하지 못했습니다.")
    }
    await createGroupBook(canonical, draft)
    setNewBookOpen(false)
    setDraft(EMPTY_DRAFT)
  }

  const addToMyLibrary = async (groupBook: GroupBook) => {
    setBusyId(groupBook.id)
    setPanelError(null)
    try {
      const canonical = await CanonicalBookService.getById(
        groupBook.canonical_book_id,
      )
      if (!canonical) throw new Error("공유 판본 정보를 찾을 수 없습니다.")

      const created = await registerUserBook(
        userUid,
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
      router.push(`/book/${created.id}/${userUid}`)
    } catch (error) {
      setPanelError(errorMessage(error, "내 서재에 책을 추가하지 못했습니다."))
    } finally {
      setBusyId(null)
    }
  }

  const openEdit = (book: GroupBook) => {
    setEditing(book)
    setEditDraft({
      selected_reason: book.selected_reason ?? "",
    })
    setPanelError(null)
  }

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (
      !editing ||
      !isOwner ||
      editDraft.selected_reason === (editing.selected_reason ?? "")
    ) {
      return
    }
    setBusyId(editing.id)
    setPanelError(null)
    const patch: UpdateGroupBookInput = {
      selected_reason: editDraft.selected_reason.trim() || undefined,
    }
    try {
      await ReadingGroupService.updateGroupBook(editing.id, patch)
      await refresh()
      setEditing(null)
    } catch (error) {
      setPanelError(errorMessage(error, "모임 책을 수정하지 못했습니다."))
    } finally {
      setBusyId(null)
    }
  }

  const removeBook = async (book: GroupBook) => {
    if (!window.confirm(`『${book.title}』을(를) 모임 책장에서 삭제할까요?`)) {
      return
    }
    setBusyId(book.id)
    setPanelError(null)
    try {
      await ReadingGroupService.deleteGroupBook(book.id)
      await refresh()
      setEditing(null)
    } catch (error) {
      setPanelError(errorMessage(error, "모임 책을 삭제하지 못했습니다."))
    } finally {
      setBusyId(null)
    }
  }

  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]))
  const assignmentsByBook = new Map(
    assignments.map((assignment) => [assignment.group_book_id, assignment]),
  )
  const effectiveStatus = (book: GroupBook): GroupBookStatus => {
    if (["completed", "paused", "reading_paused"].includes(book.status)) return book.status
    const assignment = assignmentsByBook.get(book.id)
    if (!assignment) return book.status
    const meeting = meetingsById.get(assignment.meeting_id)
    if (meeting?.status === "completed") return "completed"
    return nowMs >= new Date(assignment.reading_start_at).getTime()
      ? "reading"
      : "planned"
  }
  const statusOptionsFor = (book: GroupBook): SelectOption<GroupBookStatus>[] => {
    const assignment = assignmentsByBook.get(book.id)
    const status = effectiveStatus(book)
    if (status === "paused") return [{ value: "paused", label: "중단" }]
    if (!assignment) {
      return STATUS_OPTIONS.filter((option) =>
        ["planned", "on_hold"].includes(option.value),
      )
    }
    if (status === "completed") return [{ value: "completed", label: "완료" }]
    if (nowMs < new Date(assignment.reading_start_at).getTime()) {
      return [{ value: "planned", label: "예정" }]
    }
    return STATUS_OPTIONS.filter((option) =>
      ["reading", "reading_paused", "paused"].includes(option.value),
    )
  }
  const handleTimerPageMove = (book: GroupBook, ownBook: Book) => {
    const assignment = assignmentsByBook.get(book.id)
    const href = `/book/${ownBook.id}/${userUid}`
    if (assignment && nowMs < new Date(assignment.reading_start_at).getTime()) {
      setPrePeriodTimerTarget({ href, title: book.title })
      return
    }
    router.push(href)
  }
  const changeStatus = async (book: GroupBook, status: GroupBookStatus) => {
    setBusyId(book.id)
    setPanelError(null)
    try {
      await ReadingGroupService.updateGroupBookStatus(book.id, { status })
      const ownBook = booksByCanonical.get(book.canonical_book_id)
      if (status === "paused" && ownBook) {
        const sessions = await ReadingSessionService.getBookReadingSessions(ownBook.id)
        const results = await Promise.allSettled(
          sessions.map((session) =>
            ReadingSessionService.syncGroupAttributionsForSession(session.id),
          ),
        )
        if (results.some((result) => result.status === "rejected")) {
          console.warn(
            "일부 개인 독서 세션의 중단 시점 귀속 재동기화에 실패했습니다.",
          )
        }
      }
      await onChangedAction()
    } catch (error) {
      setPanelError(errorMessage(error, "책 상태를 변경하지 못했습니다."))
    } finally {
      setBusyId(null)
    }
  }
  const editIsDirty = Boolean(
    editing &&
      editDraft.selected_reason !== (editing.selected_reason ?? ""),
  )
  const editingAssignment = editing
    ? assignmentsByBook.get(editing.id)
    : undefined
  const editingRange = editingAssignment
    ? inclusiveReadingDateRange(
        editingAssignment.reading_start_at,
        editingAssignment.reading_end_at,
        timeZone,
      )
    : undefined
  const editingStoppedDate = editingAssignment?.stopped_at
    ? groupDateKey(editingAssignment.stopped_at, timeZone)
    : undefined
  const hasReadingBooks = books.some(
    (book) => effectiveStatus(book) === "reading",
  )
  const orderedStatusSections = (
    hasReadingBooks
      ? ["reading", "planned", "completed", "reading_paused", "paused", "on_hold"]
      : ["planned", "reading", "completed", "reading_paused", "paused", "on_hold"]
  ).map(
    (status) =>
      STATUS_SECTIONS.find((section) => section.status === status)!,
  )

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-theme-primary">모임 책장</h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setAddOpen(true)
              setSelectedCanonicals([])
              setPanelError(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-theme px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            모임 책 추가
          </button>
        )}
      </div>

      {panelError && (
        <p
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {panelError}
        </p>
      )}

      <div className="space-y-7">
        {orderedStatusSections.map((section) => {
          const sectionBooks = books.filter(
            (book) => effectiveStatus(book) === section.status,
          )
          return (
            <section key={section.status} aria-labelledby={`books-${section.status}`}>
              <div className="mb-3 flex items-center gap-2">
                <h3
                  id={`books-${section.status}`}
                  className="font-semibold text-theme-primary"
                >
                  {section.label}
                </h3>
                <span className="rounded-full bg-theme-tertiary px-2 py-0.5 text-xs text-theme-secondary">
                  {sectionBooks.length}
                </span>
              </div>
              {sectionBooks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-theme-tertiary p-4 text-center text-sm text-theme-secondary">
                  이 상태의 책이 없습니다.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {sectionBooks.map((book) => {
                    const ownBook = booksByCanonical.get(book.canonical_book_id)
                    const assignment = assignmentsByBook.get(book.id)
                    const displayStatus = effectiveStatus(book)
                    const range = assignment
                      ? inclusiveReadingDateRange(
                          assignment.reading_start_at,
                          assignment.reading_end_at,
                          timeZone,
                        )
                      : undefined
                    const stoppedDate = assignment?.stopped_at
                      ? groupDateKey(assignment.stopped_at, timeZone)
                      : undefined
                    const rangeStatusLabel =
                      displayStatus === "reading_paused"
                        ? "정지"
                        : displayStatus === "paused"
                          ? "중단"
                          : displayStatus === "completed"
                            ? "완료"
                            : displayStatus === "planned"
                              ? "예정"
                              : undefined
                    return (
                      <li
                        key={book.id}
                        className="relative grid min-w-0 grid-cols-[4.7rem_minmax(0,1fr)] gap-3 rounded-xl bg-theme-tertiary p-3"
                      >
                        {isOwner ? (
                          <button
                            type="button"
                            onClick={() => openEdit(book)}
                            className="absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-md bg-theme-secondary/90 text-theme-secondary shadow-sm transition-colors hover:bg-theme-primary hover:text-theme-primary"
                            aria-label={`${book.title} 모임 책 정보 수정`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                        <div className="relative h-28 w-[4.7rem] overflow-hidden rounded-md bg-theme-secondary shadow-sm">
                          {book.cover_url ? (
                            <Image
                              src={book.cover_url}
                              alt={`${book.title} 표지`}
                              fill
                              sizes="75px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-theme-secondary">
                              표지 없음
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="line-clamp-2 font-semibold text-theme-primary">
                            {book.title}
                          </h4>
                          <p className="mt-0.5 truncate text-sm text-theme-secondary">
                            {book.author || "저자 미상"}
                          </p>
                          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-theme-secondary">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {range ? (
                              <span className="font-medium text-theme-primary">
                                {range.startDate} ~ {stoppedDate ?? range.endDate}
                                {rangeStatusLabel && (
                                  <span className="ml-1 text-[10px] font-normal text-theme-secondary">
                                    ({rangeStatusLabel})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span>회차 미배정</span>
                            )}
                          </p>
                          {book.selected_reason && (
                            <p className="mt-2 line-clamp-3 text-sm text-theme-secondary">
                              {book.selected_reason}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2 flex min-w-0 flex-col gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {isOwner ? (
                              <div className="min-w-0 flex-1">
                                <Select
                                  value={displayStatus}
                                  onChangeAction={(status) =>
                                    void changeStatus(book, status)
                                  }
                                  options={statusOptionsFor(book)}
                                  disabled={
                                    busyId === book.id ||
                                    displayStatus === "completed"
                                  }
                                  variant="compact"
                                  aria-label={`${book.title} 상태`}
                                />
                              </div>
                            ) : (
                              <span className="flex h-8 min-w-0 flex-1 items-center justify-center truncate rounded-md bg-theme-secondary px-2 text-xs font-medium text-theme-secondary">
                                {
                                  STATUS_SECTIONS.find(
                                    (item) => item.status === displayStatus,
                                  )?.label
                                }
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  groupReadingNotesPath(groupId, {
                                    meeting: assignment?.meeting_id,
                                    book: book.id,
                                  }),
                                )
                              }
                              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-theme-tertiary bg-theme-primary px-3 text-xs font-semibold text-theme-primary transition-colors hover:bg-theme-secondary"
                              aria-label={`${book.title} 독서 노트 보기`}
                            >
                              기록
                            </button>
                          </div>
                          {ownBook ? (
                            <button
                              type="button"
                              onClick={() => handleTimerPageMove(book, ownBook)}
                              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent-theme px-3 text-xs font-semibold text-white sm:text-sm"
                            >
                              {isGuardian ? "자녀 읽어주러 가기" : "타이머 시작"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void addToMyLibrary(book)}
                              disabled={busyId === book.id}
                              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent-theme px-3 text-xs font-semibold text-white disabled:opacity-50 sm:text-sm"
                            >
                              {busyId === book.id
                                ? "추가 중…"
                                : "내 서재에 추가"}
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <FormModalFrame
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="모임 책 추가"
        size="wide"
        interactionLocked={Boolean(busyId)}
      >
        <div className="space-y-5">
          {panelError && (
            <p
              className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {panelError}
            </p>
          )}
          <form onSubmit={handleSearch} className="flex gap-2">
            <label htmlFor="canonical-title-search" className="sr-only">
              공유 판본 제목 검색
            </label>
            <input
              id="canonical-title-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="form-control min-w-0 flex-1"
              placeholder="제목·저자 키워드로 검색"
            />
            <button
              type="submit"
              disabled={!searchText.trim() || isSearching}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent-theme px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Search className="h-4 w-4" aria-hidden />
              {isSearching ? "검색 중…" : "검색"}
            </button>
          </form>

          <GroupFields value={draft} onChange={setDraft} idPrefix="add-group-book" />

          {selectedCanonicals.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-theme-primary">
                선택한 책 {selectedCanonicals.length}권
              </h3>
              <ul className="max-h-36 space-y-2 overflow-y-auto">
                {selectedCanonicals.map((canonical) => (
                  <li key={canonical.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-accent-theme/40 bg-theme-secondary p-3">
                      <input
                        type="checkbox"
                        checked
                        disabled={busyId === "batch-add"}
                        onChange={() => toggleCanonical(canonical)}
                        className="h-4 w-4 shrink-0 accent-[var(--accent-theme)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-theme-primary">
                          {canonical.title}
                        </p>
                        <p className="truncate text-xs text-theme-secondary">
                          {canonical.author || "저자 미상"}
                          {canonical.publisher
                            ? ` · ${canonical.publisher}`
                            : ""}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasSearched && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-theme-primary">
                공유 판본 검색 결과
              </h3>
              {searchResults.length ? (
                <ul className="max-h-52 space-y-2 overflow-y-auto">
                  {searchResults.map((canonical) => {
                    const duplicate = existingCanonicalIds.has(canonical.id)
                    const checked =
                      duplicate ||
                      selectedCanonicals.some((item) => item.id === canonical.id)
                    return (
                      <li key={canonical.id}>
                        <label
                          className={`flex items-center gap-3 rounded-lg bg-theme-tertiary p-3 ${
                            duplicate
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={duplicate || busyId === "batch-add"}
                            onChange={() => toggleCanonical(canonical)}
                            className="h-4 w-4 shrink-0 accent-[var(--accent-theme)]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-theme-primary">
                              {canonical.title}
                            </p>
                            <p className="truncate text-xs text-theme-secondary">
                              {canonical.author || "저자 미상"}
                              {canonical.publisher
                                ? ` · ${canonical.publisher}`
                                : ""}
                            </p>
                          </div>
                          {duplicate && (
                            <span className="shrink-0 text-xs font-medium text-theme-secondary">
                              추가됨
                            </span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="rounded-lg bg-theme-tertiary p-3 text-sm text-theme-secondary">
                  검색 결과가 없습니다. 새 책으로 등록할 수 있습니다.
                </p>
              )}
            </div>
          )}

          {selectedCanonicals.length > 0 && (
            <button
              type="button"
              onClick={() => void addSelectedCanonicals()}
              disabled={busyId === "batch-add"}
              className="w-full rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyId === "batch-add"
                ? "추가 중…"
                : `선택한 책 ${selectedCanonicals.length}권 추가`}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setAddOpen(false)
              setNewBookOpen(true)
              setPanelError(null)
            }}
            className="w-full rounded-lg border border-theme-tertiary px-4 py-2.5 text-sm font-semibold text-theme-primary"
          >
            검색 결과에 없는 새 책 등록
          </button>
        </div>
      </FormModalFrame>

      <AddBookModal
        isOpen={newBookOpen}
        onClose={() => setNewBookOpen(false)}
        onAddBook={addNewBookToLibraryAndGroup}
        initialTitle={searchText.trim()}
        userBookDuplicateKeys={duplicateKeys}
        enableExploreEditionSuggest={false}
      />

      <FormModalFrame
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="모임 책 정보"
        interactionLocked={Boolean(editing && busyId === editing.id)}
        headerEnd={
          isOwner && editing ? (
            <button
              type="button"
              onClick={() => void removeBook(editing)}
              disabled={busyId === editing.id || Boolean(editingAssignment)}
              className="shrink-0 rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/30"
              aria-label={`${editing.title} 모임 책장에서 삭제`}
              title={
                editingAssignment
                  ? "회차에 연결된 책은 삭제할 수 없습니다."
                  : "모임 책장에서 삭제"
              }
            >
              <Trash2 className="h-5 w-5" aria-hidden />
            </button>
          ) : undefined
        }
      >
        <div className="space-y-5">
          {panelError && (
            <p
              className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {panelError}
            </p>
          )}
          {editing && (
            <>
              <div className="flex gap-4 rounded-lg bg-theme-tertiary p-3">
                <div className="relative h-32 w-[5.3rem] shrink-0 overflow-hidden rounded-md bg-theme-secondary shadow-sm">
                  {editing.cover_url ? (
                    <Image
                      src={editing.cover_url}
                      alt={`${editing.title} 표지`}
                      fill
                      sizes="85px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-theme-secondary">
                      표지 없음
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-theme-primary">
                    {editing.title}
                  </h3>
                  <p className="mt-1 text-sm text-theme-secondary">
                    {editing.author || "저자 미상"}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-theme-secondary px-2.5 py-1 text-xs font-medium text-theme-secondary">
                    {
                      STATUS_SECTIONS.find(
                        (item) => item.status === effectiveStatus(editing),
                      )?.label
                    }
                  </span>
                  <p className="mt-3 flex items-start gap-1 text-xs text-theme-secondary">
                    <CalendarDays
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    {editingRange ? (
                      <span className="font-medium text-theme-primary">
                        {editingRange.startDate} ~{" "}
                        {editingStoppedDate ?? editingRange.endDate}
                        {(() => {
                          const rangeStatusLabel =
                            editingStoppedDate
                              ? "중단"
                              : effectiveStatus(editing) === "completed"
                                ? "완료"
                                : effectiveStatus(editing) === "reading_paused"
                                  ? "정지"
                                  : undefined
                          return rangeStatusLabel ? (
                            <span className="ml-1 text-[10px] font-normal text-theme-secondary">
                              ({rangeStatusLabel})
                            </span>
                          ) : null
                        })()}
                      </span>
                    ) : (
                      "아직 회차에 배정되지 않았습니다."
                    )}
                  </p>
                  {editingRange && editingStoppedDate && (
                    <p className="mt-1 text-xs text-theme-secondary">
                      원래 예정 {editingRange.startDate} ~ {editingRange.endDate}
                    </p>
                  )}
                </div>
              </div>

              {isOwner ? (
                <form onSubmit={saveEdit} className="space-y-5">
                  <GroupFields
                    value={editDraft}
                    onChange={setEditDraft}
                    idPrefix="edit-group-book"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-md bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
                    >
                      닫기
                    </button>
                    <button
                      type="submit"
                      disabled={
                        !editIsDirty ||
                        Boolean(editing && busyId === editing.id)
                      }
                      className="rounded-md bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      저장
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-theme-primary">
                    선정 이유
                  </h3>
                  <p className="min-h-20 whitespace-pre-wrap rounded-lg bg-theme-tertiary p-3 text-sm text-theme-secondary">
                    {editing.selected_reason || "등록된 선정 이유가 없습니다."}
                  </p>
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-md bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </FormModalFrame>

      <ConfirmModal
        isOpen={Boolean(prePeriodTimerTarget)}
        onClose={() => setPrePeriodTimerTarget(null)}
        onConfirm={() => {
          if (!prePeriodTimerTarget) return
          router.push(prePeriodTimerTarget.href)
        }}
        title={
          isGuardian ? "읽기 기간 전 · 자녀 읽어주기" : "읽기 기간 전이에요"
        }
        message={
          isGuardian
            ? `이 기간 전에 시작한 읽어주기는 해당 회차 누적에 반영되지 않고 전체 독서 시간에만 쌓입니다.\n\n『${prePeriodTimerTarget?.title}』 페이지로 이동할까요?`
            : `이 기간 전에 시작한 타이머는 해당 회차 누적에 반영되지 않고 전체 독서 시간에만 쌓입니다.\n\n${prePeriodTimerTarget?.title} 상세 페이지로 이동할까요?`
        }
        confirmText={goReadConfirmText}
        cancelText="닫기"
        icon={AlertCircle}
        iconColor="text-amber-600"
        iconBgColor="bg-amber-100 dark:bg-amber-950/30"
        confirmButtonColor="bg-accent-theme"
        confirmButtonHoverColor="hover:bg-accent-theme-secondary"
        showSubtitle={false}
      />
    </div>
  )
}
