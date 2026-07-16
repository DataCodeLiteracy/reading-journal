"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import FormModalFrame from "@/components/FormModalFrame"
import Select, { type SelectOption } from "@/components/Select"
import { queryKeys } from "@/lib/queryKeys"
import { BookService } from "@/services/bookService"
import { CritiqueService } from "@/services/critiqueService"
import { QuoteService } from "@/services/quoteService"
import { ReadingGroupService } from "@/services/readingGroupService"
import type {
  GroupBook,
  GroupMeeting,
  GroupRecordShare,
  GroupRecordShareType,
} from "@/types/readingGroup"

type Props = {
  groupId: string
  books: GroupBook[]
  meetings: GroupMeeting[]
  initialShares: GroupRecordShare[]
  userUid: string
  displayName: string
  isOwner: boolean
  onChangedAction: () => void | Promise<unknown>
}

type Candidate = {
  key: string
  recordType: GroupRecordShareType
  recordId: string
  groupBookId: string
  canonicalBookId: string
  bookTitle: string
  title: string
  excerpt: string
}

const TYPE_LABEL: Record<GroupRecordShareType, string> = {
  quote: "인용",
  critique: "서평",
  review: "리뷰",
}

function formatDate(value?: string | Date) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date)
}

export default function GroupRecordSharesPanel({
  groupId,
  books,
  meetings,
  initialShares,
  userUid,
  displayName,
  isOwner,
  onChangedAction,
}: Props) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState("")
  const [meetingId, setMeetingId] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const sharesQuery = useQuery({
    queryKey: queryKeys.readingGroups.recordShares(groupId),
    queryFn: () => ReadingGroupService.getGroupRecordShares(groupId),
    initialData: initialShares,
  })
  const candidatesQuery = useQuery({
    queryKey: queryKeys.readingGroups.recordShareCandidates(groupId, userUid),
    enabled: modalOpen,
    queryFn: async (): Promise<Candidate[]> => {
      const [ownBooks, quotes, critiques] = await Promise.all([
        BookService.getUserBooks(userUid),
        QuoteService.getUserQuotes(userUid),
        CritiqueService.getUserCritiques(userUid),
      ])
      const groupBookByCanonical = new Map(
        books.map((book) => [book.canonical_book_id, book]),
      )
      const matchingBooks = ownBooks.filter(
        (book) => book.canonicalBookId && groupBookByCanonical.has(book.canonicalBookId),
      )
      const ownBookById = new Map(matchingBooks.map((book) => [book.id, book]))
      const candidates: Candidate[] = []

      quotes.forEach((quote) => {
        const book = ownBookById.get(quote.bookId)
        const groupBook = book?.canonicalBookId
          ? groupBookByCanonical.get(book.canonicalBookId)
          : undefined
        if (!book || !book.canonicalBookId || !groupBook) return
        candidates.push({
          key: `quote:${quote.id}`,
          recordType: "quote",
          recordId: quote.id,
          groupBookId: groupBook.id,
          canonicalBookId: book.canonicalBookId,
          bookTitle: book.title,
          title: "인용 기록",
          excerpt: quote.quoteText,
        })
      })
      critiques.forEach((critique) => {
        const book = ownBookById.get(critique.bookId)
        const groupBook = book?.canonicalBookId
          ? groupBookByCanonical.get(book.canonicalBookId)
          : undefined
        if (!book || !book.canonicalBookId || !groupBook) return
        candidates.push({
          key: `critique:${critique.id}`,
          recordType: "critique",
          recordId: critique.id,
          groupBookId: groupBook.id,
          canonicalBookId: book.canonicalBookId,
          bookTitle: book.title,
          title: critique.title?.trim() || "서평",
          excerpt: critique.content,
        })
      })
      matchingBooks.forEach((book) => {
        if (!book.review?.trim() || !book.canonicalBookId) return
        const groupBook = groupBookByCanonical.get(book.canonicalBookId)
        if (!groupBook) return
        candidates.push({
          key: `review:${book.id}`,
          recordType: "review",
          recordId: book.id,
          groupBookId: groupBook.id,
          canonicalBookId: book.canonicalBookId,
          bookTitle: book.title,
          title: "리뷰",
          excerpt: book.review.trim(),
        })
      })
      return candidates
    },
  })

  const shares = sharesQuery.data ?? []
  const existingKeys = useMemo(
    () =>
      new Set(
        shares
          .filter((share) => share.shared_by_user_id === userUid)
          .map((share) => `${share.record_type}:${share.record_id}`),
      ),
    [shares, userUid],
  )
  const candidates = (candidatesQuery.data ?? []).filter(
    (candidate) => !existingKeys.has(candidate.key),
  )
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]))
  const meetingOptions: SelectOption[] = [
    { value: "", label: "회차 연결 안 함" },
    ...meetings.map((meeting) => ({
      value: meeting.id,
      label: `${meeting.sequence}회 · ${meeting.title}`,
    })),
  ]

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.recordShares(groupId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.recordShareCandidates(groupId, userUid),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.readingGroups.detail(groupId),
      }),
      onChangedAction(),
    ])
  }

  const share = async (event: React.FormEvent) => {
    event.preventDefault()
    const candidate = candidates.find((item) => item.key === selectedKey)
    if (!candidate) return setError("공유할 기록을 선택해 주세요.")
    setBusy(true)
    setError("")
    try {
      await ReadingGroupService.createRecordShare(groupId, {
        shared_by_user_id: userUid,
        shared_by_display_name: displayName,
        record_type: candidate.recordType,
        record_id: candidate.recordId,
        group_book_id: candidate.groupBookId,
        canonical_book_id: candidate.canonicalBookId,
        book_title: candidate.bookTitle,
        record_title: candidate.title,
        record_excerpt: candidate.excerpt,
        meeting_id: meetingId || undefined,
        note: note.trim() || undefined,
        shared_at: new Date().toISOString(),
      })
      await refresh()
      setModalOpen(false)
      setSelectedKey("")
      setMeetingId("")
      setNote("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "기록을 공유하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (shareItem: GroupRecordShare) => {
    if (!window.confirm("이 공유 기록을 그룹에서 삭제할까요?")) return
    setBusy(true)
    setError("")
    try {
      await ReadingGroupService.deleteRecordShare(shareItem.id)
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "공유 기록을 삭제하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-theme-primary">공유 기록</h2>
          <p className="mt-1 text-xs text-theme-secondary">
            모임 책과 같은 판본의 내 인용, 서평, 리뷰를 스냅샷으로 공유합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("")
            setModalOpen(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-theme px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          내 기록 공유
        </button>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
      {!shares.length ? (
        <p className="rounded-lg border border-dashed border-theme-tertiary p-8 text-center text-sm text-theme-secondary">
          아직 그룹에 공유된 기록이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {shares.map((shareItem) => {
            const canDelete = isOwner || shareItem.shared_by_user_id === userUid
            const linkedMeeting = shareItem.meeting_id
              ? meetingsById.get(shareItem.meeting_id)
              : undefined
            return (
              <li key={shareItem.id} className="rounded-xl bg-theme-tertiary p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-theme-secondary px-2 py-0.5 text-[11px] font-medium text-theme-secondary">
                        {TYPE_LABEL[shareItem.record_type] ?? shareItem.record_type}
                      </span>
                      <span className="text-xs text-theme-secondary">
                        {shareItem.book_title || "책 정보 없음"}
                      </span>
                    </div>
                    <h3 className="mt-2 font-semibold text-theme-primary">
                      {shareItem.record_title || TYPE_LABEL[shareItem.record_type] || "공유 기록"}
                    </h3>
                    <p className="mt-1 text-xs text-theme-secondary">
                      {shareItem.shared_by_display_name || "이름 없는 멤버"} ·{" "}
                      {formatDate(shareItem.shared_at ?? shareItem.created_at)}
                      {linkedMeeting && ` · ${linkedMeeting.sequence}회`}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void remove(shareItem)}
                      disabled={busy}
                      className="shrink-0 rounded-lg bg-theme-secondary p-2 text-red-600 disabled:opacity-50"
                      aria-label={`${shareItem.record_title || "공유 기록"} 삭제`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-theme-primary">
                  {shareItem.record_excerpt || "이전 형식으로 공유되어 표시할 스냅샷이 없습니다."}
                </p>
                {shareItem.note && (
                  <p className="mt-3 rounded-lg bg-theme-secondary p-3 text-sm text-theme-secondary">
                    {shareItem.note}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <FormModalFrame
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="내 기록 공유"
        size="wide"
        interactionLocked={busy}
      >
        <form onSubmit={share} className="space-y-4">
          {candidatesQuery.isLoading ? (
            <p className="text-sm text-theme-secondary" role="status">공유 가능한 기록을 불러오는 중…</p>
          ) : !candidates.length ? (
            <p className="rounded-lg bg-theme-tertiary p-4 text-sm text-theme-secondary">
              공유할 새 기록이 없습니다. 모임 책과 같은 판본으로 등록된 개인 책의 기록만 표시됩니다.
            </p>
          ) : (
            <fieldset className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-theme-tertiary p-3">
              <legend className="px-1 text-sm font-semibold text-theme-primary">공유할 기록</legend>
              {candidates.map((candidate) => (
                <label
                  key={candidate.key}
                  className="flex cursor-pointer gap-3 rounded-lg bg-theme-tertiary p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="share-record"
                    required
                    value={candidate.key}
                    checked={selectedKey === candidate.key}
                    onChange={() => setSelectedKey(candidate.key)}
                    className="peer sr-only"
                  />
                  <span
                    className="mt-1 h-4 w-4 shrink-0 rounded-full border border-theme-secondary bg-theme-primary ring-offset-2 peer-checked:border-accent-theme peer-checked:bg-accent-theme peer-focus-visible:ring-2 peer-focus-visible:ring-accent-theme"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="font-medium text-theme-primary">
                      {TYPE_LABEL[candidate.recordType]} · {candidate.bookTitle}
                    </span>
                    <span className="mt-1 block line-clamp-2 whitespace-pre-wrap text-xs text-theme-secondary">
                      {candidate.excerpt}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <label htmlFor="record-share-meeting" className="block text-sm font-medium text-theme-primary">
            연결할 회차 (선택)
            <Select
              id="record-share-meeting"
              value={meetingId}
              onChange={setMeetingId}
              options={meetingOptions}
              emptyValue=""
              className="mt-1"
              menuPlacement="top"
              aria-label="연결할 회차"
            />
          </label>
          <label htmlFor="record-share-note" className="block text-sm font-medium text-theme-primary">
            공유 메모 (선택)
            <textarea
              id="record-share-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="form-control form-control-textarea mt-1"
            />
          </label>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy || !selectedKey || !candidates.length}
              className="rounded-lg bg-accent-theme px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "공유 중…" : "그룹에 공유"}
            </button>
          </div>
        </form>
      </FormModalFrame>
    </div>
  )
}
