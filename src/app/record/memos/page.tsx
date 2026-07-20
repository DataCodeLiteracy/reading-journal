"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Globe,
  Lock,
  Plus,
  Search,
  StickyNote,
  User,
  X,
} from "lucide-react"
import MemoModal from "@/components/MemoModal"
import Select, { type SelectOption } from "@/components/Select"
import { useAuth } from "@/contexts/AuthContext"
import { queryKeys } from "@/lib/queryKeys"
import { BookService } from "@/services/bookService"
import { MemoService } from "@/services/memoService"
import type { Book } from "@/types/book"
import type { BookMemo } from "@/types/memo"
import { memoTocDisplayText } from "@/utils/questionChapterPath"

function formatDate(value: unknown) {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : null
  if (!date || Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(date)
}

function bookMatchesQuery(book: Book, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const title = book.title?.toLowerCase() ?? ""
  const author = book.author?.toLowerCase() ?? ""
  return title.includes(q) || author.includes(q)
}

export default function MemosPage() {
  const router = useRouter()
  const { isLoggedIn, loading, userUid } = useAuth()
  const [bookSearch, setBookSearch] = useState("")
  const [bookSearchOpen, setBookSearchOpen] = useState(false)
  const [selectedBookId, setSelectedBookId] = useState("")
  const [showOnlyMine, setShowOnlyMine] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BookMemo | null>(null)
  const [composeBookId, setComposeBookId] = useState("")

  useEffect(() => {
    if (!loading && !isLoggedIn) router.push("/login")
  }, [isLoggedIn, loading, router])

  const booksQuery = useQuery({
    queryKey: queryKeys.user.books(userUid),
    queryFn: () => BookService.getUserBooks(userUid!),
    enabled: Boolean(isLoggedIn && userUid),
    staleTime: 30_000,
  })

  const memosQuery = useQuery({
    queryKey: ["bookMemos", userUid, showOnlyMine, selectedBookId],
    queryFn: async () => {
      if (!userUid) return [] as BookMemo[]
      if (showOnlyMine) {
        const list = await MemoService.getUserMemos(userUid)
        return selectedBookId
          ? list.filter((m) => m.bookId === selectedBookId)
          : list
      }
      const publicList = await MemoService.getPublicMemos(200)
      return selectedBookId
        ? publicList.filter((m) => m.bookId === selectedBookId)
        : publicList
    },
    enabled: Boolean(isLoggedIn && userUid),
  })

  const booksById = useMemo(() => {
    const map = new Map<string, Book>()
    for (const book of booksQuery.data ?? []) map.set(book.id, book)
    return map
  }, [booksQuery.data])

  const bookSearchResults = useMemo(() => {
    const q = bookSearch.trim()
    if (!q) return [] as Book[]
    return (booksQuery.data ?? [])
      .filter((book) => bookMatchesQuery(book, q))
      .slice(0, 8)
  }, [booksQuery.data, bookSearch])

  const bookOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "전체 책" },
      ...(booksQuery.data ?? []).map((book) => ({
        value: book.id,
        label: book.author ? `${book.title} — ${book.author}` : book.title,
      })),
    ],
    [booksQuery.data],
  )

  const composeBook = booksById.get(composeBookId || selectedBookId)

  const pickBookFromSearch = (book: Book) => {
    setSelectedBookId(book.id)
    setBookSearch(book.title)
    setBookSearchOpen(false)
  }

  const clearBookSearch = () => {
    setBookSearch("")
    setBookSearchOpen(false)
  }

  const openCreate = () => {
    const bookId = selectedBookId || (booksQuery.data?.[0]?.id ?? "")
    if (!bookId) {
      alert("먼저 서재에 책을 추가해주세요.")
      return
    }
    setComposeBookId(bookId)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (memo: BookMemo) => {
    setComposeBookId(memo.bookId)
    setEditing(memo)
    setModalOpen(true)
  }

  if (loading || !isLoggedIn) {
    return (
      <div className="min-h-screen bg-theme-gradient pb-24">
        <div className="container mx-auto animate-pulse px-4 py-6">
          <div className="mb-4 h-8 w-40 rounded bg-theme-tertiary" />
          <div className="h-64 rounded-xl bg-theme-tertiary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/record")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-theme-secondary hover:text-theme-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          활동
        </button>

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-theme-primary">
              <StickyNote className="h-6 w-6 text-teal-600" aria-hidden />
              메모
            </h1>
            <p className="mt-1 text-sm text-theme-secondary">
              목차에 맞춰 떠오른 생각을 남겨 보세요. 목차 없이도 먼저 적을 수
              있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent-theme px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            작성
          </button>
        </div>

        <div className="mb-4 space-y-3 rounded-xl border border-theme-tertiary bg-theme-secondary p-4">
          <div>
            <label
              htmlFor="memo-book-search"
              className="mb-1.5 block text-sm font-medium text-theme-primary"
            >
              책 검색
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-tertiary"
                aria-hidden
              />
              <input
                id="memo-book-search"
                type="search"
                value={bookSearch}
                onChange={(e) => {
                  setBookSearch(e.target.value)
                  setBookSearchOpen(true)
                }}
                onFocus={() => {
                  if (bookSearch.trim()) setBookSearchOpen(true)
                }}
                placeholder="제목·저자로 검색…"
                autoComplete="off"
                className="w-full rounded-lg border border-theme-tertiary bg-theme-primary py-2 pl-10 pr-10 text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme"
              />
              {bookSearch ? (
                <button
                  type="button"
                  onClick={clearBookSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-theme-primary"
                  aria-label="검색어 지우기"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
            {bookSearchOpen && bookSearch.trim() ? (
              <ul
                className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-theme-tertiary bg-theme-primary"
                role="listbox"
                aria-label="책 검색 결과"
              >
                {bookSearchResults.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm text-theme-secondary">
                    검색 결과가 없습니다.
                  </li>
                ) : (
                  bookSearchResults.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedBookId === book.id}
                        onClick={() => pickBookFromSearch(book)}
                        className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-theme-tertiary/60 ${
                          selectedBookId === book.id
                            ? "bg-accent-theme/10 text-accent-theme"
                            : "text-theme-primary"
                        }`}
                      >
                        <span className="font-medium">{book.title}</span>
                        {book.author ? (
                          <span className="text-xs text-theme-secondary">
                            {book.author}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-theme-primary">
              책 선택
            </label>
            <Select
              value={selectedBookId}
              onChangeAction={(id) => {
                setSelectedBookId(id)
                setBookSearchOpen(false)
                if (!id) setBookSearch("")
                else {
                  const book = booksById.get(id)
                  if (book) setBookSearch(book.title)
                }
              }}
              options={bookOptions}
              aria-label="책 필터"
              variant="toolbar"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={showOnlyMine}
              onClick={() => setShowOnlyMine(true)}
              className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                showOnlyMine
                  ? "bg-accent-theme text-white"
                  : "bg-theme-tertiary text-theme-primary"
              }`}
            >
              <User className="h-3.5 w-3.5" aria-hidden />내 메모
            </button>
            <button
              type="button"
              aria-pressed={!showOnlyMine}
              onClick={() => setShowOnlyMine(false)}
              className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                !showOnlyMine
                  ? "bg-accent-theme text-white"
                  : "bg-theme-tertiary text-theme-primary"
              }`}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              공개 메모
            </button>
          </div>
        </div>

        {memosQuery.isLoading ? (
          <p className="rounded-lg border border-dashed border-theme-tertiary p-8 text-center text-sm text-theme-secondary">
            메모를 불러오는 중…
          </p>
        ) : (memosQuery.data?.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-theme-tertiary p-8 text-center text-sm text-theme-secondary">
            아직 메모가 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {memosQuery.data!.map((memo) => {
              const book = booksById.get(memo.bookId)
              const canEdit = memo.user_id === userUid
              return (
                <li key={memo.id}>
                  <button
                    type="button"
                    onClick={() => (canEdit ? openEdit(memo) : undefined)}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-theme-tertiary bg-theme-secondary p-3 text-left disabled:cursor-default"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-theme-secondary">
                      <span className="font-medium text-theme-primary">
                        {book?.title ?? "책"}
                      </span>
                      {memo.chapterPath?.length || memo.tocPath ? (
                        <span>
                          · {memoTocDisplayText(memo.tocPath, memo.chapterPath)}
                        </span>
                      ) : (
                        <span>· 목차 미연결</span>
                      )}
                      <span>· {formatDate(memo.created_at)}</span>
                      {memo.isPublic ? (
                        <Globe className="h-3 w-3" aria-hidden />
                      ) : (
                        <Lock className="h-3 w-3" aria-hidden />
                      )}
                    </div>
                    <p className="line-clamp-4 whitespace-pre-wrap text-sm text-theme-primary">
                      {memo.content}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {composeBook ? (
        <MemoModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          bookId={composeBook.id}
          bookTitle={composeBook.title}
          tocOutline={composeBook.tocOutline}
          existingMemo={editing}
          onSave={async (data) => {
            if (!userUid) return
            if (editing) {
              await MemoService.updateMemo(editing.id, {
                content: data.content,
                isPublic: data.isPublic,
                chapterPath: data.chapterPath?.length ? data.chapterPath : [],
                tocPath: data.tocPath || "",
              })
            } else {
              await MemoService.createMemo({
                ...data,
                user_id: userUid,
                bookId: composeBook.id,
              })
            }
            await memosQuery.refetch()
          }}
        />
      ) : null}
    </div>
  )
}
