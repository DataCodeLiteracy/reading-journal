"use client"

import { useState, useEffect } from "react"
import { Check, ClipboardCopy, ListTree } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import type { BookTocEntry } from "@/types/bookToc"
import { BookService } from "@/services/bookService"
import { useAuth } from "@/contexts/AuthContext"
import { BookDetailRouteSkeleton } from "@/components/skeletons"
import { BookTocTreeEditor } from "@/components/BookTocTreeEditor"
import {
  bookTocOutlineToCanonicalJson,
  normalizeBookTocPath,
  normalizeBookTocStartPage,
} from "@/utils/bookToc"
import {
  entriesForPersist,
  validateTocForSave,
} from "@/utils/bookTocTree"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"
import { BookTocViewModal } from "@/components/BookTocViewModal"
import { navigateBackSmart } from "@/utils/navigateBack"

export default function BookTocPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolved, setResolved] = useState<{
    id: string
    user_id: string
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const [tocViewOpen, setTocViewOpen] = useState(false)
  const [entries, setEntries] = useState<BookTocEntry[]>([])

  useEffect(() => {
    params.then(setResolved)
  }, [params])

  useEffect(() => {
    if (!resolved) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const b = await BookService.getBook(resolved.id)
        if (cancelled) return
        if (!b) {
          setError("책을 찾을 수 없습니다.")
          setBook(null)
          return
        }
        setBook(b)
        const raw = b.tocOutline ?? []
        setEntries(
          raw.map((e) => ({
            ...e,
            path: normalizeBookTocPath(e.path) ?? e.path.trim(),
            title: (e.title ?? "").trim(),
            startPage: normalizeBookTocStartPage(e.startPage),
          })),
        )
      } catch {
        if (!cancelled) setError("불러오는 중 오류가 발생했습니다.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolved])

  const base = resolved
    ? `/book/${resolved.id}/${resolved.user_id}`
    : ""

  const isOwner = Boolean(
    resolved && userUid && userUid === resolved.user_id,
  )

  const handleSave = async () => {
    if (!resolved?.id) return
    const err = validateTocForSave(entries)
    if (err) {
      setError(err)
      return
    }
    const sorted = entriesForPersist(entries)
    try {
      setSaving(true)
      setError(null)
      await BookService.updateBook(resolved.id, {
        tocOutline: sorted.length ? sorted : undefined,
      })
      const b = await BookService.getBook(resolved.id)
      if (b) setBook(b)
      setEntries(sorted)
    } catch {
      setError("저장하지 못했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const handleCopyJson = async () => {
    const forCopy = entriesForPersist(entries)
    if (forCopy.length === 0) {
      setError("복사할 목차가 없습니다. 경로·제목을 모두 채운 뒤 저장 가능한 형태로 맞춰 주세요.")
      return
    }
    const json = bookTocOutlineToCanonicalJson(forCopy)
    try {
      await navigator.clipboard.writeText(json)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2000)
      setError(null)
    } catch {
      setError("클립보드에 복사하지 못했습니다.")
    }
  }

  if (loading || !resolved) {
    return <BookDetailRouteSkeleton />
  }

  if (error && !book) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center px-4'>
        <p className='text-theme-secondary'>{error}</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center px-4'>
        <p className='text-theme-secondary'>책을 찾을 수 없습니다.</p>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className='min-h-screen bg-theme-gradient flex flex-col items-center justify-center gap-4 px-4'>
        <p className='text-center text-theme-secondary'>
          목차는 이 책의 소유자만 편집할 수 있습니다.
        </p>
        <button
          type='button'
          onClick={() => navigateBackSmart(router, base)}
          className='rounded-lg bg-accent-theme px-4 py-2 text-white'
        >
          책으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-24'>
      <div className='container mx-auto max-w-2xl px-4 py-4'>
        <BookSubpageHeader
          pageTitle='목차'
          contextTitle={book.title}
          fallbackPath={base}
          leading={
            <ListTree className='h-5 w-5 text-accent-theme' aria-hidden />
          }
          trailing={
            <button
              type='button'
              disabled={saving}
              onClick={handleCopyJson}
              title={
                copyDone
                  ? "클립보드에 복사했습니다"
                  : "목차 JSON을 클립보드에 복사"
              }
              className='rounded-full p-2 text-theme-secondary transition-colors hover:bg-theme-tertiary/50 hover:text-theme-primary disabled:opacity-40'
              aria-label={
                copyDone ? "JSON 복사됨" : "목차 JSON 클립보드에 복사"
              }
            >
              {copyDone ? (
                <Check className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
              ) : (
                <ClipboardCopy className='h-5 w-5' />
              )}
            </button>
          }
        />

        <details className='mb-4 rounded-lg border border-theme-tertiary/70 bg-theme-secondary/50 text-sm text-theme-secondary'>
          <summary className='cursor-pointer select-none px-3 py-2.5 font-medium text-theme-primary marker:text-theme-tertiary'>
            목차 등록 방법 (탭하여 펼치기)
          </summary>
          <div className='space-y-2 border-t border-theme-tertiary/50 px-3 py-3 text-xs leading-relaxed sm:text-sm'>
            <p>
              <span className='font-medium text-theme-primary'>최상위 추가</span>로{" "}
              <code className='rounded bg-theme-tertiary/80 px-1 font-mono'>1</code>
              부터 만들고, 각 줄의{" "}
              <span className='font-medium text-theme-primary'>하위</span>로{" "}
              <code className='rounded bg-theme-tertiary/80 px-1 font-mono'>1.1</code>
              …처럼 이어 붙입니다. 최대 네 단계(
              <code className='rounded bg-theme-tertiary/80 px-1 font-mono'>
                1.1.1.1
              </code>
              )까지입니다.
            </p>
            <p>
              <span className='font-medium text-theme-primary'>시작 쪽</span>은
              인쇄본 기준 선택 입력입니다. 목록은 위에서 아래로 한 줄씩 펼쳐
              보이며, 왼쪽 화살표로 하위만 접었다 펼 수 있습니다.
            </p>
          </div>
        </details>

        {error && (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'>
            {error}
          </div>
        )}

        <BookTocTreeEditor
          key={book.id}
          entries={entries}
          onEntriesChangeAction={setEntries}
          disabled={saving}
        />

        <div className='mt-6 flex flex-col gap-2'>
          <button
            type='button'
            disabled={saving}
            onClick={handleSave}
            className='w-full rounded-xl bg-accent-theme px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:opacity-50'
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          <button
            type='button'
            disabled={saving}
            onClick={() => setTocViewOpen(true)}
            className='w-full rounded-xl border border-theme-tertiary bg-theme-secondary/60 px-4 py-2.5 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary/35 disabled:opacity-50'
          >
            목차 보기
          </button>
        </div>
      </div>

      <BookTocViewModal
        open={tocViewOpen}
        onClose={() => setTocViewOpen(false)}
        entries={entries}
      />
    </div>
  )
}
