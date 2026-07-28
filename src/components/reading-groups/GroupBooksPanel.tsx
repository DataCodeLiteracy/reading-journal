"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, ArrowRightLeft, CalendarDays, Pencil, Plus, Search, Trash2 } from "lucide-react"
import AddBookModal from "@/components/AddBookModal"
import ConfirmModal from "@/components/ConfirmModal"
import FormModalFrame from "@/components/FormModalFrame"
import { BookTocViewModal } from "@/components/BookTocViewModal"
import Select, { type SelectOption } from "@/components/Select"
import GroupTocBadge from "@/components/reading-groups/GroupTocBadge"
import { queryKeys } from "@/lib/queryKeys"
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
import type { BookTocEntry } from "@/types/bookToc"
import type { CanonicalBook } from "@/types/canonicalBook"
import type {
  GroupBook,
  GroupBookStatus,
  GroupMeeting,
  MeetingBookAssignment,
  MeetingBookRecommendation,
  UpdateGroupBookInput,
} from "@/types/readingGroup"
import { normalizeBookDuplicateKey } from "@/utils/bookTitleKey"
import {
  groupDateKey,
  inclusiveReadingDateRange,
} from "@/utils/readingGroupDates"
import { memberHasRole } from "@/utils/groupMemberLabels"
import { groupReadingNotesPath } from "@/utils/groupReadingNotesUrl"

type Props = {
  groupId: string
  books: GroupBook[]
  meetings: GroupMeeting[]
  assignments: MeetingBookAssignment[]
  recommendations?: MeetingBookRecommendation[]
  timeZone: string
  isOwner: boolean
  userUid: string
  displayName: string
  memberKind?: "participant" | "guardian"
  memberRoles?: ("participant" | "guardian")[]
  onChangedAction: () => void | Promise<unknown>
}

type GroupBookDraft = {
  selected_reason: string
}

type AddBookMode = "official" | "recommend"

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
  reasonLabel = "선정 이유",
  reasonPlaceholder = "이 책을 함께 읽는 이유를 적어 주세요.",
}: {
  value: GroupBookDraft
  onChange: (value: GroupBookDraft) => void
  idPrefix: string
  reasonLabel?: string
  reasonPlaceholder?: string
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-reason`} className="mb-1 block text-sm font-medium text-theme-primary">
          {reasonLabel}
        </label>
        <textarea
          id={`${idPrefix}-reason`}
          value={value.selected_reason}
          onChange={(event) =>
            onChange({ ...value, selected_reason: event.target.value })
          }
          rows={3}
          className="form-control form-control-textarea"
          placeholder={reasonPlaceholder}
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
  recommendations = [],
  timeZone,
  isOwner,
  userUid,
  displayName,
  memberKind,
  memberRoles,
  onChangedAction,
}: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isGuardian = memberHasRole(
    { member_kind: memberKind, member_roles: memberRoles },
    "guardian",
  )
  const goReadConfirmText = isGuardian ? "읽어주러 가기" : "책 상세로 이동"
  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<AddBookMode>(
    isOwner ? "official" : "recommend",
  )
  const [recommendMeetingId, setRecommendMeetingId] = useState("")
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
  const [convertMeetingId, setConvertMeetingId] = useState("")
  const [editingRecommendation, setEditingRecommendation] =
    useState<MeetingBookRecommendation | null>(null)
  const [recommendNoteDraft, setRecommendNoteDraft] = useState("")
  const [confirmIntent, setConfirmIntent] = useState<
    | { type: "delete-book"; book: GroupBook }
    | { type: "convert" }
    | { type: "promote-recommendation" }
    | { type: "delete-recommendation"; item: MeetingBookRecommendation }
    | null
  >(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [prePeriodTimerTarget, setPrePeriodTimerTarget] = useState<{
    title: string
    canonicalBookId: string
    href?: string
    needsLibraryAdd: boolean
    beforePeriod: boolean
  } | null>(null)
  const [tocModal, setTocModal] = useState<{
    title: string
    entries: BookTocEntry[]
  } | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const userBooksQuery = useQuery({
    queryKey: queryKeys.user.books(userUid),
    queryFn: () => BookService.getUserBooks(userUid),
    enabled: Boolean(userUid),
    staleTime: 30_000,
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

  const canonicalIdsKey = useMemo(() => {
    const ids = [...existingCanonicalIds].filter(Boolean).sort()
    return ids.join(",")
  }, [existingCanonicalIds])

  const tocOutlinesQuery = useQuery({
    queryKey: queryKeys.readingGroups.canonicalTocOutlines(
      groupId,
      canonicalIdsKey,
    ),
    queryFn: () =>
      CanonicalBookService.getTocOutlinesByIds(
        canonicalIdsKey ? canonicalIdsKey.split(",") : [],
      ),
    enabled: Boolean(canonicalIdsKey),
    staleTime: 60_000,
  })
  const tocByCanonical = tocOutlinesQuery.data ?? {}

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

  const assignmentCanonicalIdsForMeeting = useMemo(() => {
    const map = new Map<string, Set<string>>()
    assignments.forEach((assignment) => {
      const set = map.get(assignment.meeting_id) ?? new Set<string>()
      set.add(assignment.canonical_book_id)
      map.set(assignment.meeting_id, set)
    })
    return map
  }, [assignments])

  const recommendedCanonicalIdsForMeeting = useMemo(() => {
    const map = new Map<string, Set<string>>()
    recommendations.forEach((item) => {
      const set = map.get(item.meeting_id) ?? new Set<string>()
      set.add(item.canonical_book_id)
      map.set(item.meeting_id, set)
    })
    return map
  }, [recommendations])

  const meetingOptions: SelectOption[] = useMemo(
    () =>
      [...meetings]
        .filter((meeting) => meeting.status !== "completed")
        .sort((left, right) => left.sequence - right.sequence)
        .map((meeting) => ({
          value: meeting.id,
          label: `${meeting.sequence}회 · ${meeting.title}`,
        })),
    [meetings],
  )

  const openAddModal = (mode: AddBookMode) => {
    setAddMode(mode)
    setSelectedCanonicals([])
    setPanelError(null)
    setRecommendMeetingId(meetingOptions[0]?.value ?? "")
    setAddOpen(true)
  }

  const addSelectedCanonicals = async () => {
    if (selectedCanonicals.length === 0) {
      setPanelError("추가할 책을 한 권 이상 선택해 주세요.")
      return
    }

    setBusyId("batch-add")
    setPanelError(null)
    try {
      if (addMode === "official") {
        const toAdd = selectedCanonicals.filter(
          (canonical) => !existingCanonicalIds.has(canonical.id),
        )
        if (toAdd.length === 0) {
          setPanelError("이미 모임 책장에 있는 책만 선택되어 있습니다.")
          return
        }
        for (const canonical of toAdd) {
          await createGroupBook(canonical, draft, { refreshAfter: false })
        }
      } else {
        if (!recommendMeetingId) {
          setPanelError("추천할 회차를 선택해 주세요.")
          return
        }
        const assigned =
          assignmentCanonicalIdsForMeeting.get(recommendMeetingId) ?? new Set()
        const alreadyRecommended =
          recommendedCanonicalIdsForMeeting.get(recommendMeetingId) ?? new Set()
        for (const canonical of selectedCanonicals) {
          if (assigned.has(canonical.id)) {
            throw new Error(
              `『${canonical.title}』은(는) 이미 이 회차의 공식 배정 책입니다.`,
            )
          }
          if (alreadyRecommended.has(canonical.id)) {
            // allow other users; block only same user duplicates via service
          }
          await ReadingGroupService.createMeetingBookRecommendation(groupId, {
            meeting_id: recommendMeetingId,
            canonical_book_id: canonical.id,
            title: canonical.title,
            author: canonical.author,
            cover_url: canonical.coverUrl,
            recommended_by_user_id: userUid,
            recommended_by_display_name: displayName,
            note: draft.selected_reason.trim() || undefined,
          })
        }
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
      setPanelError(
        errorMessage(
          error,
          addMode === "official"
            ? "모임 책을 추가하지 못했습니다."
            : "함께 보면 좋은 책을 추천하지 못했습니다.",
        ),
      )
    } finally {
      setBusyId(null)
    }
  }

  const addNewBookToLibraryAndGroup = async (
    input: Omit<Book, "id" | "user_id">,
  ) => {
    const latestBooks = await queryClient.fetchQuery({
      queryKey: queryKeys.user.books(userUid),
      queryFn: () => BookService.getUserBooks(userUid),
      staleTime: 30_000,
    })
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
    if (addMode === "recommend") {
      if (!recommendMeetingId) {
        throw new Error("추천할 회차를 선택해 주세요.")
      }
      await ReadingGroupService.createMeetingBookRecommendation(groupId, {
        meeting_id: recommendMeetingId,
        canonical_book_id: canonical.id,
        title: canonical.title,
        author: canonical.author,
        cover_url: canonical.coverUrl,
        recommended_by_user_id: userUid,
        recommended_by_display_name: displayName,
        note: draft.selected_reason.trim() || undefined,
      })
      await refresh()
    } else {
      await createGroupBook(canonical, draft)
    }
    setNewBookOpen(false)
    setDraft(EMPTY_DRAFT)
  }

  const startTimerForBook = async (book: GroupBook) => {
    const assignment = assignmentsByBook.get(book.id)
    const ownBook = booksByCanonical.get(book.canonical_book_id)
    const beforePeriod = Boolean(
      assignment && nowMs < new Date(assignment.reading_start_at).getTime(),
    )
    if (!ownBook || beforePeriod) {
      setPrePeriodTimerTarget({
        title: book.title,
        canonicalBookId: book.canonical_book_id,
        href: ownBook ? `/book/${ownBook.id}/${userUid}` : undefined,
        needsLibraryAdd: !ownBook,
        beforePeriod,
      })
      return
    }
    router.push(`/book/${ownBook.id}/${userUid}`)
  }

  const confirmTimerFromBooks = async () => {
    if (!prePeriodTimerTarget || busyId === "timer-register") return
    setBusyId("timer-register")
    setPanelError(null)
    try {
      let href = prePeriodTimerTarget.href
      if (!href) {
        const canonical = await CanonicalBookService.getById(
          prePeriodTimerTarget.canonicalBookId,
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
        href = `/book/${created.id}/${userUid}`
      }
      setPrePeriodTimerTarget(null)
      router.push(href)
    } catch (error) {
      setPanelError(errorMessage(error, "책 상세 페이지로 이동하지 못했습니다."))
    } finally {
      setBusyId(null)
    }
  }

  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]))
  const assignmentsByBook = new Map(
    assignments.map((assignment) => [assignment.group_book_id, assignment]),
  )

  const openEdit = (book: GroupBook) => {
    setEditing(book)
    setEditDraft({
      selected_reason: book.selected_reason ?? "",
    })
    const linkedMeetingId = assignmentsByBook.get(book.id)?.meeting_id
    const defaultMeetingId =
      (linkedMeetingId &&
        meetingOptions.some((option) => option.value === linkedMeetingId) &&
        linkedMeetingId) ||
      meetingOptions[0]?.value ||
      ""
    setConvertMeetingId(defaultMeetingId)
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
    if (assignmentsByBook.get(book.id)) {
      setPanelError(
        "회차에 배정된 모임 책은 삭제할 수 없습니다. 함께 보면 좋은 책으로 바꾸거나, 먼저 회차 배정을 해제해 주세요.",
      )
      return
    }
    setConfirmIntent({ type: "delete-book", book })
  }

  const executeRemoveBook = async (book: GroupBook) => {
    setBusyId(book.id)
    setPanelError(null)
    try {
      await ReadingGroupService.deleteGroupBook(book.id)
      await refresh()
      setEditing(null)
      setConfirmIntent(null)
    } catch (error) {
      setPanelError(errorMessage(error, "모임 책을 삭제하지 못했습니다."))
      setConfirmIntent(null)
    } finally {
      setBusyId(null)
    }
  }

  const convertEditingToRecommendation = () => {
    if (!editing || !isOwner) return
    if (!convertMeetingId) {
      setPanelError("추천으로 옮길 회차를 선택해 주세요.")
      return
    }
    setConfirmIntent({ type: "convert" })
  }

  const executeConvertToRecommendation = async () => {
    if (!editing || !isOwner || !convertMeetingId) return
    setBusyId(editing.id)
    setPanelError(null)
    try {
      await ReadingGroupService.convertGroupBookToRecommendation(editing.id, {
        meeting_id: convertMeetingId,
        recommended_by_user_id: userUid,
        recommended_by_display_name: displayName,
        note: editDraft.selected_reason.trim() || undefined,
      })
      await refresh()
      setEditing(null)
      setConfirmIntent(null)
    } catch (error) {
      setPanelError(
        errorMessage(error, "함께 보면 좋은 책으로 바꾸지 못했습니다."),
      )
      setConfirmIntent(null)
    } finally {
      setBusyId(null)
    }
  }

  const promoteRecommendationToGroupBook = () => {
    if (!editingRecommendation || !isOwner) return
    setConfirmIntent({ type: "promote-recommendation" })
  }

  const executePromoteRecommendation = async () => {
    if (!editingRecommendation || !isOwner) return
    setBusyId(editingRecommendation.id)
    setPanelError(null)
    try {
      await ReadingGroupService.convertRecommendationToGroupBook(
        editingRecommendation.id,
        {
          selected_reason:
            (editingRecommendation.recommended_by_user_id === userUid
              ? recommendNoteDraft.trim()
              : editingRecommendation.note?.trim()) || undefined,
        },
      )
      await refresh()
      setEditingRecommendation(null)
      setConfirmIntent(null)
    } catch (error) {
      setPanelError(errorMessage(error, "모임 책으로 바꾸지 못했습니다."))
      setConfirmIntent(null)
    } finally {
      setBusyId(null)
    }
  }

  const removeRecommendation = (item: MeetingBookRecommendation) => {
    if (item.recommended_by_user_id !== userUid) return
    setConfirmIntent({ type: "delete-recommendation", item })
  }

  const executeRemoveRecommendation = async (
    item: MeetingBookRecommendation,
  ) => {
    if (item.recommended_by_user_id !== userUid) return
    setBusyId(item.id)
    setPanelError(null)
    try {
      await ReadingGroupService.deleteMeetingBookRecommendation(
        item.id,
        userUid,
      )
      await refresh()
      setEditingRecommendation(null)
      setConfirmIntent(null)
    } catch (error) {
      setPanelError(errorMessage(error, "추천 책을 삭제하지 못했습니다."))
      setConfirmIntent(null)
    } finally {
      setBusyId(null)
    }
  }

  const openRecommendEdit = (item: MeetingBookRecommendation) => {
    setEditingRecommendation(item)
    setRecommendNoteDraft(item.note ?? "")
    setPanelError(null)
  }

  const saveRecommendEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingRecommendation) return
    if (editingRecommendation.recommended_by_user_id !== userUid) return
    if (recommendNoteDraft === (editingRecommendation.note ?? "")) {
      setEditingRecommendation(null)
      return
    }
    setBusyId(editingRecommendation.id)
    setPanelError(null)
    try {
      await ReadingGroupService.updateMeetingBookRecommendation(
        editingRecommendation.id,
        userUid,
        { note: recommendNoteDraft.trim() || undefined },
      )
      await refresh()
      setEditingRecommendation(null)
    } catch (error) {
      setPanelError(errorMessage(error, "추천 이유를 수정하지 못했습니다."))
    } finally {
      setBusyId(null)
    }
  }

  const recommendEditIsDirty = Boolean(
    editingRecommendation &&
      recommendNoteDraft !== (editingRecommendation.note ?? ""),
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-theme-primary">모임 책장</h2>
        <button
          type="button"
          onClick={() => openAddModal(isOwner ? "official" : "recommend")}
          disabled={!isOwner && meetingOptions.length === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-accent-theme px-2.5 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          title={
            !isOwner && meetingOptions.length === 0
              ? "추천하려면 회차가 필요합니다."
              : undefined
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          책 추가
        </button>
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
                        className="grid min-w-0 grid-cols-[4.7rem_minmax(0,1fr)] gap-3 rounded-xl bg-theme-tertiary p-3"
                      >
                        <div className="flex w-[4.7rem] flex-col gap-1.5">
                          <div className="relative h-28 w-full overflow-hidden rounded-md bg-theme-secondary shadow-sm">
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
                          {tocByCanonical[book.canonical_book_id]?.length ? (
                            <GroupTocBadge
                              onOpenAction={() =>
                                setTocModal({
                                  title: book.title,
                                  entries: tocByCanonical[book.canonical_book_id]!,
                                })
                              }
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start gap-0">
                            <h4 className="min-w-0 flex-1 line-clamp-2 font-semibold text-theme-primary">
                              {book.title}
                            </h4>
                            {isOwner ? (
                              <button
                                type="button"
                                onClick={() => openEdit(book)}
                                className="inline-flex shrink-0 items-center justify-center rounded-md py-0.5 pl-0 pr-0.5 text-theme-secondary transition-colors hover:text-theme-primary"
                                aria-label={`${book.title} 모임 책 정보 수정`}
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </button>
                            ) : null}
                          </div>
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
                              <div className="w-[100px] shrink-0">
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
                                  variant="toolbar"
                                  triggerClassName="rounded-md px-2 text-xs"
                                  aria-label={`${book.title} 상태`}
                                />
                              </div>
                            ) : (
                              <span className="flex h-10 w-[100px] shrink-0 items-center justify-center truncate rounded-md bg-theme-secondary px-1 text-xs font-medium text-theme-secondary">
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
                              className="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-md bg-slate-700 px-3 text-xs font-semibold text-white sm:text-sm dark:bg-slate-200 dark:text-slate-900"
                              aria-label={`${book.title} 독서 노트 보기`}
                            >
                              기록
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => void startTimerForBook(book)}
                            disabled={busyId === book.id || busyId === "timer-register"}
                            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent-theme px-3 text-xs font-semibold text-white disabled:opacity-50 sm:text-sm"
                          >
                            {busyId === book.id || busyId === "timer-register"
                              ? "준비 중…"
                              : isGuardian
                                ? "자녀 읽어주러 가기"
                                : "타이머 시작"}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}

        <section aria-labelledby="books-recommendations">
          <div className="mb-3 flex items-center gap-2">
            <h3
              id="books-recommendations"
              className="font-semibold text-theme-primary"
            >
              함께 보면 좋은 책
            </h3>
            <span className="rounded-full bg-theme-tertiary px-2 py-0.5 text-xs text-theme-secondary">
              {recommendations.length}
            </span>
          </div>
          {recommendations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-theme-tertiary p-4 text-center text-sm text-theme-secondary">
              멤버가 추천한 책이 없습니다.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {[...recommendations]
                .sort((left, right) => {
                  const leftMeeting = meetingsById.get(left.meeting_id)
                  const rightMeeting = meetingsById.get(right.meeting_id)
                  const sequenceDiff =
                    (leftMeeting?.sequence ?? 0) - (rightMeeting?.sequence ?? 0)
                  if (sequenceDiff !== 0) return sequenceDiff
                  return left.title.localeCompare(right.title, "ko")
                })
                .map((item) => {
                  const meeting = meetingsById.get(item.meeting_id)
                  const isMine = item.recommended_by_user_id === userUid
                  const canManage = isOwner || isMine
                  return (
                    <li
                      key={item.id}
                      className="grid min-w-0 grid-cols-[4.7rem_minmax(0,1fr)] gap-3 rounded-xl bg-theme-tertiary p-3"
                    >
                      <div className="relative h-28 w-[4.7rem] shrink-0 overflow-hidden rounded-md bg-theme-secondary shadow-sm">
                        {item.cover_url ? (
                          <Image
                            src={item.cover_url}
                            alt={`${item.title} 표지`}
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
                        <div className="flex items-start gap-0">
                          <h4 className="min-w-0 flex-1 line-clamp-2 font-semibold text-theme-primary">
                            {item.title}
                          </h4>
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openRecommendEdit(item)}
                              className="inline-flex shrink-0 items-center justify-center rounded-md py-0.5 pl-0 pr-0.5 text-theme-secondary transition-colors hover:text-theme-primary"
                              aria-label={
                                isMine
                                  ? `${item.title} 추천 정보 수정`
                                  : `${item.title} 모임 책으로 바꾸기`
                              }
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-theme-secondary">
                          {item.author || "저자 미상"}
                        </p>
                        <p className="mt-2 text-xs text-theme-secondary">
                          {meeting
                            ? `${meeting.sequence}회 · ${meeting.title}`
                            : "회차 정보 없음"}
                        </p>
                        <p className="mt-1 text-xs text-theme-secondary">
                          추천 · {item.recommended_by_display_name}
                        </p>
                        {item.note && (
                          <p className="mt-2 line-clamp-3 text-sm text-theme-secondary">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
            </ul>
          )}
        </section>
      </div>

      <FormModalFrame
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={
          addMode === "official" ? "모임 책 추가" : "함께 보면 좋은 책 추천"
        }
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

          {isOwner && (
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-theme-tertiary p-1">
              {(
                [
                  { id: "official" as const, label: "모임 책" },
                  { id: "recommend" as const, label: "함께 보면 좋은 책" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setAddMode(mode.id)
                    setSelectedCanonicals([])
                    setPanelError(null)
                  }}
                  className={`rounded-md px-2 py-2 text-sm font-semibold ${
                    addMode === mode.id
                      ? "bg-theme-secondary text-theme-primary shadow-sm"
                      : "text-theme-secondary"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          {addMode === "recommend" && (
            <div>
              <label
                htmlFor="recommend-meeting"
                className="mb-1.5 block text-sm font-medium text-theme-primary"
              >
                추천할 회차
              </label>
              <Select
                id="recommend-meeting"
                value={recommendMeetingId}
                onChangeAction={setRecommendMeetingId}
                options={[
                  { value: "", label: "회차를 선택해 주세요" },
                  ...meetingOptions,
                ]}
                emptyValue=""
                truncate={false}
                aria-label="추천할 회차"
              />
              <p className="mt-2 text-xs text-theme-secondary">
                공식 회차 책과 별개로, 멤버들이 참고로 읽으면 좋은 책을 추천합니다.
              </p>
            </div>
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

          <GroupFields
            value={draft}
            onChange={setDraft}
            idPrefix="add-group-book"
            reasonLabel={
              addMode === "official" ? "선정 이유" : "추천 이유 (선택)"
            }
            reasonPlaceholder={
              addMode === "official"
                ? "이 책을 함께 읽는 이유를 적어 주세요."
                : "이 책을 추천하는 이유를 적어 주세요."
            }
          />

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
                    const assignedBlocked =
                      addMode === "recommend" &&
                      Boolean(recommendMeetingId) &&
                      (
                        assignmentCanonicalIdsForMeeting.get(
                          recommendMeetingId,
                        ) ?? new Set()
                      ).has(canonical.id)
                    const duplicate =
                      addMode === "official"
                        ? existingCanonicalIds.has(canonical.id)
                        : assignedBlocked
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
                              {addMode === "official" ? "추가됨" : "회차 배정"}
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
                : addMode === "official"
                  ? `선택한 책 ${selectedCanonicals.length}권 추가`
                  : `선택한 책 ${selectedCanonicals.length}권 추천`}
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
                  <p className="mt-3 flex items-center gap-1 text-xs text-theme-secondary">
                    <CalendarDays
                      className="h-3.5 w-3.5 shrink-0"
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

                  <div className="rounded-lg border border-theme-tertiary p-3">
                    <h4 className="text-sm font-semibold text-theme-primary">
                      함께 보면 좋은 책으로 바꾸기
                    </h4>
                    <p className="mt-1 text-xs text-theme-secondary">
                      모임 책장에서 빼고, 선택한 회차의 멤버 추천으로 옮깁니다.
                      {editingAssignment
                        ? " 연결된 회차 배정도 함께 해제됩니다."
                        : ""}
                    </p>
                    <div className="mt-3 space-y-2">
                      <label
                        htmlFor="convert-meeting"
                        className="block text-sm font-medium text-theme-primary"
                      >
                        추천 회차
                      </label>
                      <Select
                        id="convert-meeting"
                        value={convertMeetingId}
                        onChangeAction={setConvertMeetingId}
                        options={[
                          { value: "", label: "회차 선택" },
                          ...meetingOptions,
                        ]}
                        disabled={
                          meetingOptions.length === 0 ||
                          Boolean(editing && busyId === editing.id)
                        }
                        aria-label="추천으로 옮길 회차"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void convertEditingToRecommendation()}
                      disabled={
                        !convertMeetingId ||
                        meetingOptions.length === 0 ||
                        Boolean(editing && busyId === editing.id)
                      }
                      className="mt-3 w-full rounded-md bg-theme-tertiary px-4 py-2.5 text-sm font-semibold text-theme-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      추천으로 바꾸기
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void removeBook(editing)}
                      disabled={
                        Boolean(editingAssignment) ||
                        Boolean(editing && busyId === editing.id)
                      }
                      title={
                        editingAssignment
                          ? "회차에 배정된 모임 책은 삭제할 수 없습니다."
                          : undefined
                      }
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      책장에서 삭제
                    </button>
                    <div className="flex gap-2">
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

      <FormModalFrame
        isOpen={Boolean(editingRecommendation)}
        onClose={() => setEditingRecommendation(null)}
        title="함께 보면 좋은 책"
        interactionLocked={Boolean(
          editingRecommendation && busyId === editingRecommendation.id,
        )}
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
          {editingRecommendation && (
            <>
              <div className="flex gap-4 rounded-lg bg-theme-tertiary p-3">
                <div className="relative h-32 w-[5.3rem] shrink-0 overflow-hidden rounded-md bg-theme-secondary shadow-sm">
                  {editingRecommendation.cover_url ? (
                    <Image
                      src={editingRecommendation.cover_url}
                      alt={`${editingRecommendation.title} 표지`}
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
                    {editingRecommendation.title}
                  </h3>
                  <p className="mt-1 text-sm text-theme-secondary">
                    {editingRecommendation.author || "저자 미상"}
                  </p>
                  <p className="mt-3 text-xs text-theme-secondary">
                    {(() => {
                      const meeting = meetingsById.get(
                        editingRecommendation.meeting_id,
                      )
                      return meeting
                        ? `${meeting.sequence}회 · ${meeting.title}`
                        : "회차 정보 없음"
                    })()}
                  </p>
                  <p className="mt-1 text-xs text-theme-secondary">
                    추천 · {editingRecommendation.recommended_by_display_name}
                  </p>
                </div>
              </div>

              {editingRecommendation.recommended_by_user_id === userUid ? (
                <form onSubmit={saveRecommendEdit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="edit-recommendation-note"
                      className="mb-1 block text-sm font-medium text-theme-primary"
                    >
                      추천 이유 (선택)
                    </label>
                    <textarea
                      id="edit-recommendation-note"
                      value={recommendNoteDraft}
                      onChange={(event) =>
                        setRecommendNoteDraft(event.target.value)
                      }
                      rows={3}
                      className="form-control form-control-textarea"
                      placeholder="이 책을 추천하는 이유를 적어 주세요."
                    />
                  </div>
                  {isOwner && (
                    <div className="rounded-lg border border-theme-tertiary p-3">
                      <h4 className="text-sm font-semibold text-theme-primary">
                        모임 책으로 바꾸기
                      </h4>
                      <p className="mt-1 text-xs text-theme-secondary">
                        추천을 빼고 모임 책장에 공식 책으로 올립니다. 같은 회차의
                        동일 판본 추천도 함께 정리됩니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => promoteRecommendationToGroupBook()}
                        disabled={busyId === editingRecommendation.id}
                        className="mt-3 w-full rounded-md bg-theme-tertiary px-4 py-2.5 text-sm font-semibold text-theme-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        모임 책으로 바꾸기
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void removeRecommendation(editingRecommendation)
                      }
                      disabled={busyId === editingRecommendation.id}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      추천 삭제
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRecommendation(null)}
                        className="rounded-md bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
                      >
                        닫기
                      </button>
                      <button
                        type="submit"
                        disabled={
                          !recommendEditIsDirty ||
                          busyId === editingRecommendation.id
                        }
                        className="rounded-md bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-theme-primary">
                      추천 이유
                    </h3>
                    <p className="min-h-20 whitespace-pre-wrap rounded-lg bg-theme-tertiary p-3 text-sm text-theme-secondary">
                      {editingRecommendation.note || "등록된 추천 이유가 없습니다."}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="rounded-lg border border-theme-tertiary p-3">
                      <h4 className="text-sm font-semibold text-theme-primary">
                        모임 책으로 바꾸기
                      </h4>
                      <p className="mt-1 text-xs text-theme-secondary">
                        추천을 빼고 모임 책장에 공식 책으로 올립니다. 같은 회차의
                        동일 판본 추천도 함께 정리됩니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => promoteRecommendationToGroupBook()}
                        disabled={busyId === editingRecommendation.id}
                        className="mt-3 w-full rounded-md bg-theme-tertiary px-4 py-2.5 text-sm font-semibold text-theme-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        모임 책으로 바꾸기
                      </button>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingRecommendation(null)}
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
        isOpen={Boolean(confirmIntent)}
        onClose={() => {
          if (busyId) return
          setConfirmIntent(null)
        }}
        onConfirm={() => {
          if (!confirmIntent || busyId) return
          if (confirmIntent.type === "delete-book") {
            void executeRemoveBook(confirmIntent.book)
            return
          }
          if (confirmIntent.type === "convert") {
            void executeConvertToRecommendation()
            return
          }
          if (confirmIntent.type === "promote-recommendation") {
            void executePromoteRecommendation()
            return
          }
          void executeRemoveRecommendation(confirmIntent.item)
        }}
        title={
          confirmIntent?.type === "convert"
            ? "함께 보면 좋은 책으로 바꾸기"
            : confirmIntent?.type === "promote-recommendation"
              ? "모임 책으로 바꾸기"
              : confirmIntent?.type === "delete-recommendation"
                ? "추천 삭제"
                : "모임 책 삭제"
        }
        message={(() => {
          if (!confirmIntent) return ""
          if (confirmIntent.type === "delete-book") {
            return `『${confirmIntent.book.title}』을(를) 모임 책장에서 삭제할까요?`
          }
          if (confirmIntent.type === "delete-recommendation") {
            return `『${confirmIntent.item.title}』 추천을 삭제할까요?`
          }
          if (confirmIntent.type === "promote-recommendation") {
            if (!editingRecommendation) return ""
            const alreadyOfficial = books.some(
              (book) =>
                book.canonical_book_id ===
                editingRecommendation.canonical_book_id,
            )
            return alreadyOfficial
              ? `『${editingRecommendation.title}』은(는) 이미 모임 책장에 있습니다. 이 회차의 동일 판본 추천만 정리할까요?`
              : `『${editingRecommendation.title}』을(를) 모임 책장에 올리고, 이 회차의 동일 판본 추천을 정리할까요?`
          }
          if (!editing) return ""
          const meetingLabel =
            meetingOptions.find((option) => option.value === convertMeetingId)
              ?.label ?? "선택한 회차"
          const hasAssignment = Boolean(assignmentsByBook.get(editing.id))
          return hasAssignment
            ? `『${editing.title}』을(를) 모임 책에서 빼고 ${meetingLabel}의 «함께 보면 좋은 책»으로 옮길까요?\n회차 배정도 함께 해제됩니다.`
            : `『${editing.title}』을(를) 모임 책에서 빼고 ${meetingLabel}의 «함께 보면 좋은 책»으로 옮길까요?`
        })()}
        confirmText={
          busyId
            ? "처리 중…"
            : confirmIntent?.type === "convert"
              ? "추천으로 바꾸기"
              : confirmIntent?.type === "promote-recommendation"
                ? "모임 책으로 바꾸기"
                : "삭제"
        }
        cancelText="취소"
        icon={
          confirmIntent?.type === "convert" ||
          confirmIntent?.type === "promote-recommendation"
            ? ArrowRightLeft
            : Trash2
        }
        iconColor={
          confirmIntent?.type === "convert" ||
          confirmIntent?.type === "promote-recommendation"
            ? "text-accent-theme"
            : "text-red-500"
        }
        iconBgColor={
          confirmIntent?.type === "convert" ||
          confirmIntent?.type === "promote-recommendation"
            ? "bg-accent-theme/15"
            : "bg-red-100 dark:bg-red-900/20"
        }
        confirmButtonColor={
          confirmIntent?.type === "convert" ||
          confirmIntent?.type === "promote-recommendation"
            ? "bg-accent-theme"
            : "bg-red-500"
        }
        confirmButtonHoverColor={
          confirmIntent?.type === "convert" ||
          confirmIntent?.type === "promote-recommendation"
            ? "hover:bg-accent-theme-secondary"
            : "hover:bg-red-600"
        }
        showSubtitle={
          confirmIntent?.type !== "convert" &&
          confirmIntent?.type !== "promote-recommendation"
        }
      />

      <ConfirmModal
        isOpen={Boolean(prePeriodTimerTarget)}
        onClose={() => setPrePeriodTimerTarget(null)}
        onConfirm={() => void confirmTimerFromBooks()}
        title={
          prePeriodTimerTarget?.needsLibraryAdd
            ? isGuardian
              ? "서재 추가 후 자녀 읽어주기"
              : "서재 추가 후 타이머"
            : isGuardian
              ? "읽기 기간 전 · 자녀 읽어주기"
              : "읽기 기간 전이에요"
        }
        message={(() => {
          if (!prePeriodTimerTarget) return ""
          const pre = prePeriodTimerTarget.beforePeriod
            ? isGuardian
              ? "이 기간 전에 시작한 읽어주기는 해당 회차 누적에 반영되지 않고 전체 독서 시간에만 쌓입니다.\n\n"
              : "이 기간 전에 시작한 타이머는 해당 회차 누적에 반영되지 않고 전체 독서 시간에만 쌓입니다.\n\n"
            : ""
          if (prePeriodTimerTarget.needsLibraryAdd) {
            return `${pre}『${prePeriodTimerTarget.title}』을(를) 내 서재에 추가한 뒤 ${
              isGuardian ? "자녀 읽어주기" : "타이머"
            } 페이지로 이동할까요?`
          }
          return `${pre}『${prePeriodTimerTarget.title}』 ${
            isGuardian ? "자녀 읽어주기" : "상세"
          } 페이지로 이동할까요?`
        })()}
        confirmText={
          prePeriodTimerTarget?.needsLibraryAdd
            ? isGuardian
              ? "서재 추가 후 읽어주러 가기"
              : "서재 추가 후 이동"
            : goReadConfirmText
        }
        cancelText="닫기"
        icon={AlertCircle}
        iconColor="text-amber-600"
        iconBgColor="bg-amber-100 dark:bg-amber-950/30"
        confirmButtonColor="bg-accent-theme"
        confirmButtonHoverColor="hover:bg-accent-theme-secondary"
        showSubtitle={false}
      />

      <BookTocViewModal
        open={Boolean(tocModal)}
        onClose={() => setTocModal(null)}
        entries={tocModal?.entries ?? []}
      />
    </div>
  )
}
