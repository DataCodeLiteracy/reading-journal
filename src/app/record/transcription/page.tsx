"use client"

import { useState, useEffect, useMemo } from "react"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Filter,
  Keyboard,
  PenLine,
  Search,
  X,
} from "lucide-react"
import FormModalFrame from "@/components/FormModalFrame"
import Pagination from "@/components/Pagination"
import RecordListLoading from "@/components/RecordListLoading"
import Select, { type SelectOption } from "@/components/Select"
import { useAuth } from "@/contexts/AuthContext"
import { useRecordAvailableBooks } from "@/hooks/useRecordAvailableBooks"
import { queryKeys } from "@/lib/queryKeys"
import { RecordContent } from "@/services/recordService"
import {
  RECORD_PAGE_SIZE,
  countQuoteRecordsPage,
  fetchQuoteRecordsPage,
} from "@/services/recordPaginatedService"
import { Book } from "@/types/book"
import {
  DEFAULT_TRANSCRIPTION_REPETITIONS,
  MAX_TRANSCRIPTION_REPETITIONS,
  MIN_TRANSCRIPTION_REPETITIONS,
} from "@/utils/transcriptionLayout"
import {
  DIFFICULTY_LABELS,
  getSecondsPer10Chars,
  MIN_EXPOSURE_SECONDS,
  type TranscriptionDifficulty,
} from "@/utils/transcriptionPractice"
import type { TranscriptionUnitMode } from "@/utils/transcriptionSentences"
import {
  loadTranscriptionSelection,
  saveTranscriptionOptions,
  saveTranscriptionSelection,
  type TranscriptionMode,
  type TranscriptionSelectionItem,
} from "@/utils/transcriptionSelectionStorage"

export default function TranscriptionSelectPage() {
  const router = useRouter()
  const { isLoggedIn, loading, userUid } = useAuth()
  const [selectedBookId, setSelectedBookId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState<TranscriptionSelectionItem[]>([])
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [mode, setMode] = useState<TranscriptionMode>("print")
  const [repetitions, setRepetitions] = useState(DEFAULT_TRANSCRIPTION_REPETITIONS)
  const [unitMode, setUnitMode] = useState<TranscriptionUnitMode>("sentence")
  const [difficulty, setDifficulty] =
    useState<TranscriptionDifficulty>("normal")

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    setSelected(loadTranscriptionSelection())
  }, [])

  useEffect(() => {
    saveTranscriptionSelection(selected)
  }, [selected])

  const booksQuery = useRecordAvailableBooks(
    userUid,
    true,
    Boolean(isLoggedIn && userUid),
  )

  const scopeKey = useMemo(
    () => [selectedBookId, searchQuery, "mine"].join("\u001f"),
    [selectedBookId, searchQuery],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [scopeKey])

  const countQuery = useQuery({
    queryKey: queryKeys.record.contentCount(
      userUid!,
      "quote",
      `transcription\u001f${scopeKey}`,
    ),
    queryFn: () =>
      countQuoteRecordsPage({
        userUid: userUid!,
        showOnlyMine: true,
        bookId: selectedBookId || undefined,
        searchQuery,
      }),
    enabled: Boolean(isLoggedIn && userUid),
    staleTime: 15_000,
  })

  const totalPages = Math.max(
    1,
    Math.ceil((countQuery.data ?? 0) / RECORD_PAGE_SIZE),
  )

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const recordsQuery = useQuery({
    queryKey: queryKeys.record.contentPage(
      userUid!,
      "quote",
      `transcription\u001f${scopeKey}`,
      currentPage,
    ),
    queryFn: async () => {
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null
      for (let p = 1; p < currentPage; p++) {
        const batch = await fetchQuoteRecordsPage({
          userUid: userUid!,
          showOnlyMine: true,
          bookId: selectedBookId || undefined,
          searchQuery,
          startAfterSnapshot: cursor,
        })
        if (batch.done || !batch.nextCursor) {
          return { records: [] as RecordContent[], done: true as const }
        }
        cursor = batch.nextCursor
      }
      return fetchQuoteRecordsPage({
        userUid: userUid!,
        showOnlyMine: true,
        bookId: selectedBookId || undefined,
        searchQuery,
        startAfterSnapshot: cursor,
      })
    },
    enabled: Boolean(isLoggedIn && userUid),
    staleTime: 15_000,
  })

  const availableBooks: Book[] = booksQuery.data ?? []
  const bookFilterOptions = useMemo((): SelectOption<string>[] => {
    const opts: SelectOption<string>[] = [{ value: "", label: "전체 책" }]
    for (const book of availableBooks) {
      opts.push({
        value: book.id,
        label: `${book.title}${book.author ? ` - ${book.author}` : ""}`,
      })
    }
    return opts
  }, [availableBooks])

  const records = recordsQuery.data?.records ?? []
  const isLoading = recordsQuery.isPending && !recordsQuery.data
  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.id)),
    [selected],
  )

  const pageAllSelected =
    records.length > 0 && records.every((r) => selectedIds.has(r.id))

  const toggleRecord = (record: RecordContent) => {
    setSelected((prev) => {
      if (prev.some((p) => p.id === record.id)) {
        return prev.filter((p) => p.id !== record.id)
      }
      return [
        ...prev,
        {
          id: record.id,
          quoteText: record.content,
          bookTitle: record.bookTitle,
          bookAuthor: record.bookAuthor,
          bookId: record.bookId,
        },
      ]
    })
  }

  const toggleSelectCurrentPage = () => {
    if (records.length === 0) return
    if (pageAllSelected) {
      const pageIds = new Set(records.map((r) => r.id))
      setSelected((prev) => prev.filter((p) => !pageIds.has(p.id)))
      return
    }
    setSelected((prev) => {
      const next = [...prev]
      const have = new Set(prev.map((p) => p.id))
      for (const record of records) {
        if (have.has(record.id)) continue
        next.push({
          id: record.id,
          quoteText: record.content,
          bookTitle: record.bookTitle,
          bookAuthor: record.bookAuthor,
          bookId: record.bookId,
        })
      }
      return next
    })
  }

  const handleOpenOptions = () => {
    if (selected.length === 0) return
    setOptionsOpen(true)
  }

  const handleConfirmOptions = () => {
    const reps = Math.min(
      MAX_TRANSCRIPTION_REPETITIONS,
      Math.max(MIN_TRANSCRIPTION_REPETITIONS, Math.floor(repetitions) || 1),
    )
    saveTranscriptionOptions({
      mode,
      repetitions: reps,
      unitMode,
      difficulty,
    })
    saveTranscriptionSelection(selected)
    setOptionsOpen(false)
    if (mode === "practice") {
      router.push("/record/transcription/practice")
    } else {
      router.push("/record/transcription/print")
    }
  }

  if (loading) {
    return <RecordListLoading variant="auth" />
  }

  if (!isLoggedIn) return null

  return (
    <div className="min-h-screen bg-theme-gradient pb-[calc(11rem+env(safe-area-inset-bottom,0px))]">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => router.push("/record")}
            className="flex items-center gap-2 text-theme-secondary transition-colors hover:text-theme-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>활동으로 돌아가기</span>
          </button>
        </div>

        <header className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-theme-primary">필사하기</h1>
          <p className="text-sm text-theme-secondary">
            구절을 고른 뒤 A4 손필사 또는 타자 기억 필사를 선택합니다. 책 필터를
            바꿔도 선택은 유지됩니다.
          </p>
        </header>

        <div className="mb-6 rounded-lg border-card bg-theme-secondary p-4 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-theme-primary">
                검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="구절 내용, 책 제목, 저자로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-theme-tertiary bg-theme-primary py-2 pl-10 pr-10 text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-theme-primary">
                책 선택
              </label>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Select
                  value={selectedBookId}
                  onChangeAction={setSelectedBookId}
                  options={bookFilterOptions}
                  variant="toolbar"
                  triggerClassName="pl-10"
                  aria-label="책 선택"
                />
              </div>
            </div>
          </div>
        </div>

        {recordsQuery.isError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">
              구절 기록을 불러오는 중 오류가 발생했습니다.
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <RecordListLoading variant="quotes" />
        ) : records.length === 0 ? (
          <div className="py-12 text-center">
            <PenLine className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-theme-primary">
              구절 기록이 없습니다
            </h3>
            <p className="text-theme-secondary">
              먼저 구절을 기록한 뒤 필사할 문장을 골라 주세요.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-theme-secondary">
                총 {countQuery.data ?? 0}건 · 이 페이지 {records.length}건
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectCurrentPage}
                  className="text-sm font-medium text-accent-theme hover:underline"
                >
                  {pageAllSelected ? "이 페이지 선택 해제" : "이 페이지 전체 선택"}
                </button>
                {selected.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="text-sm text-theme-secondary underline hover:text-theme-primary"
                  >
                    선택 모두 해제
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mb-6 space-y-3">
              {records.map((record) => {
                const isChecked = selectedIds.has(record.id)
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => toggleRecord(record)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      isChecked
                        ? "border-accent-theme bg-accent-theme/10"
                        : "border-card bg-theme-secondary hover:border-theme-tertiary"
                    }`}
                  >
                    <div className="flex gap-3">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isChecked
                            ? "border-accent-theme bg-accent-theme text-white"
                            : "border-theme-tertiary bg-theme-primary"
                        }`}
                        aria-hidden
                      >
                        {isChecked ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="mb-2 text-sm font-medium text-theme-secondary">
                          {record.bookTitle}
                          {record.bookAuthor ? ` · ${record.bookAuthor}` : ""}
                        </p>
                        <p className="whitespace-pre-wrap text-theme-primary">
                          {record.content}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {(countQuery.data ?? 0) > 0 ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={countQuery.data ?? 0}
                itemsPerPage={RECORD_PAGE_SIZE}
              />
            ) : null}
          </>
        )}
      </div>

      <div className="fixed bottom-[calc(4.75rem+0.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-t border-theme-tertiary bg-theme-primary/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <p className="text-sm text-theme-secondary">
            <span className="font-semibold text-theme-primary">{selected.length}</span>
            개 선택
          </p>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={handleOpenOptions}
            className="rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            다음
          </button>
        </div>
      </div>

      <FormModalFrame
        isOpen={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        title="필사 방식 선택"
        size="wide"
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("print")}
              aria-pressed={mode === "print"}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                mode === "print"
                  ? "border-rose-500 bg-rose-100/80 shadow-sm ring-2 ring-rose-300/60 dark:border-rose-400 dark:bg-rose-950/50 dark:ring-rose-700/50"
                  : "border-slate-300 bg-slate-100/70 hover:border-rose-300 hover:bg-rose-50/70 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-rose-700 dark:hover:bg-rose-950/20"
              }`}
            >
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <PenLine className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </span>
              <span className="block text-sm font-semibold text-theme-primary">
                A4 손필사
              </span>
              <span className="mt-1 block text-xs text-theme-secondary">
                회색 가이드 + 빈 줄로 따라 쓰기 인쇄
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("practice")}
              aria-pressed={mode === "practice"}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                mode === "practice"
                  ? "border-sky-500 bg-sky-100/80 shadow-sm ring-2 ring-sky-300/60 dark:border-sky-400 dark:bg-sky-950/50 dark:ring-sky-700/50"
                  : "border-slate-300 bg-slate-100/70 hover:border-sky-300 hover:bg-sky-50/70 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-sky-700 dark:hover:bg-sky-950/20"
              }`}
            >
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Keyboard className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </span>
              <span className="block text-sm font-semibold text-theme-primary">
                타자 필사
              </span>
              <span className="mt-1 block text-xs text-theme-secondary">
                잠깐 보고 기억해서 타이핑 · 경험치
              </span>
            </button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-theme-primary">문장 단위</p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-theme-tertiary p-3">
                <input
                  type="radio"
                  name="unitMode"
                  checked={unitMode === "sentence"}
                  onChange={() => setUnitMode("sentence")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-theme-primary">
                    문장 부호로 분리
                  </span>
                  <span className="text-xs text-theme-secondary">
                    . ? ! 。？！ 및 줄바꿈 기준
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-theme-tertiary p-3">
                <input
                  type="radio"
                  name="unitMode"
                  checked={unitMode === "quote"}
                  onChange={() => setUnitMode("quote")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-theme-primary">
                    한 구절 = 한 단위
                  </span>
                  <span className="text-xs text-theme-secondary">
                    {mode === "practice"
                      ? "구절 안 문장을 순서대로, 다음 문장은 블러"
                      : "선택한 구절 전체를 한 덩어리로 필사"}
                  </span>
                </span>
              </label>
            </div>
          </div>

          {mode === "print" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-theme-primary">
                반복 횟수 (기본 {DEFAULT_TRANSCRIPTION_REPETITIONS}회)
              </label>
              <input
                type="number"
                min={MIN_TRANSCRIPTION_REPETITIONS}
                max={MAX_TRANSCRIPTION_REPETITIONS}
                value={repetitions}
                onChange={(e) => setRepetitions(Number(e.target.value))}
                className="w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme"
              />
              <p className="mt-1 text-xs text-theme-secondary">
                첫 줄은 연한 회색 따라 쓰기, 나머지 줄은 빈칸입니다.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-theme-primary">
                난이도 (노출 시간)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  Object.keys(DIFFICULTY_LABELS) as TranscriptionDifficulty[]
                ).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDifficulty(key)}
                    className={`rounded-lg border px-2 py-2.5 text-center ${
                      difficulty === key
                        ? "border-accent-theme bg-accent-theme/10 text-theme-primary"
                        : "border-theme-tertiary text-theme-secondary"
                    }`}
                  >
                    <span className="block text-sm font-medium">
                      {DIFFICULTY_LABELS[key]}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-tight opacity-80">
                      10자당 {getSecondsPer10Chars(key)}초
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1 truncate text-xs text-theme-secondary whitespace-nowrap">
                시간 = 글자÷10×위 초 · 최소 {MIN_EXPOSURE_SECONDS}초 · 공백 제외
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmOptions}
            className="w-full rounded-lg bg-accent-theme py-2.5 text-sm font-medium text-white"
          >
            {mode === "practice" ? "타자 필사 시작" : "미리보기 · 인쇄"}
          </button>
        </div>
      </FormModalFrame>
    </div>
  )
}
