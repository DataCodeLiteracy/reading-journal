"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { BookService } from "@/services/bookService"
import { useAuth } from "@/contexts/AuthContext"
import { BookDetailRouteSkeleton } from "@/components/skeletons"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"
import { getReturnPathFromWindow } from "@/utils/navigateBack"
import { isPreReadNotesEmpty, preReadNotesPreview } from "@/utils/preReadNotes"

export default function BookPreReadingPage({
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

  const [expectation, setExpectation] = useState("")
  const [whatToGain, setWhatToGain] = useState("")
  const [interestConnection, setInterestConnection] = useState("")

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
        setExpectation(b.preReadExpectation ?? "")
        setWhatToGain(b.preReadWhatToGain ?? "")
        setInterestConnection(b.preReadInterestConnection ?? "")
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

  const handleSaveAndContinue = async () => {
    if (!resolved?.id) return
    try {
      setSaving(true)
      setError(null)
      await BookService.updateBook(resolved.id, {
        preReadExpectation: expectation.trim() || undefined,
        preReadWhatToGain: whatToGain.trim() || undefined,
        preReadInterestConnection: interestConnection.trim() || undefined,
      })
      router.push(
        `${base}/questions?from=pre-reading`,
      )
    } catch {
      setError("저장하지 못했습니다. 다시 시도해 주세요.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndBack = async () => {
    if (!resolved?.id) return
    try {
      setSaving(true)
      setError(null)
      await BookService.updateBook(resolved.id, {
        preReadExpectation: expectation.trim() || undefined,
        preReadWhatToGain: whatToGain.trim() || undefined,
        preReadInterestConnection: interestConnection.trim() || undefined,
      })
      const ret = getReturnPathFromWindow()
      if (ret) {
        router.push(ret)
      } else {
        router.push(base)
      }
    } catch {
      setError("저장하지 못했습니다. 다시 시도해 주세요.")
    } finally {
      setSaving(false)
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

  const isOwner = userUid === resolved.user_id
  if (!isOwner) {
    return (
      <div className='min-h-screen bg-theme-gradient flex flex-col items-center justify-center gap-4 px-4'>
        <p className='text-theme-secondary text-center'>
          이 책의 읽기 준비 메모는 소유자만 수정할 수 있습니다.
        </p>
        <button
          type='button'
          onClick={() => router.push(base)}
          className='rounded-lg bg-accent-theme px-4 py-2 text-white'
        >
          책으로 돌아가기
        </button>
      </div>
    )
  }

  const hasToc = (book.tocOutline?.length ?? 0) > 0
  const draftBook = {
    ...book,
    preReadExpectation: expectation,
    preReadWhatToGain: whatToGain,
    preReadInterestConnection: interestConnection,
  }
  const preview = isPreReadNotesEmpty(draftBook)
    ? "아직 적은 내용이 없어요."
    : preReadNotesPreview(draftBook)

  return (
    <div className='min-h-screen bg-theme-gradient pb-24'>
      <div className='container mx-auto max-w-2xl px-4 py-4'>
        <BookSubpageHeader
          pageTitle='읽기 준비'
          contextTitle={book.title}
          fallbackPath={base}
        />

        <div className='mb-6 flex items-start gap-2 rounded-xl border border-accent-theme/30 bg-accent-theme/5 p-4'>
          <Sparkles className='mt-0.5 h-5 w-5 shrink-0 text-accent-theme' />
          <div className='min-w-0 text-sm text-theme-secondary'>
            <p className='mb-1 font-medium text-theme-primary'>
              본문에 들어가기 전에 가볍게 정리해 보세요
            </p>
            <p>
              {hasToc
                ? "제목과 목차를 보며 어떤 내용이 나올지 떠올려 보세요."
                : "제목을 보며 어떤 내용이 나올지 떠올려 보세요. 목차는 책 상세의「목차」에서 나중에 등록할 수 있어요."}
            </p>
          </div>
        </div>

        {error && (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'>
            {error}
          </div>
        )}

        <div className='space-y-5'>
          <label className='block'>
            <span className='mb-1.5 block text-sm font-medium text-theme-primary'>
              {hasToc
                ? "제목·목차를 보며 떠오른 내용"
                : "제목을 보며 떠오른 내용"}
            </span>
            <textarea
              value={expectation}
              onChange={(e) => setExpectation(e.target.value)}
              rows={4}
              className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
              placeholder='지금 떠오르는 이미지나 흐름을 적어 보세요.'
            />
          </label>
          <label className='block'>
            <span className='mb-1.5 block text-sm font-medium text-theme-primary'>
              이 책에서 무엇을 얻고 싶은지 가볍게
            </span>
            <textarea
              value={whatToGain}
              onChange={(e) => setWhatToGain(e.target.value)}
              rows={3}
              className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
              placeholder='한두 문장이면 충분해요.'
            />
          </label>
          <label className='block'>
            <span className='mb-1.5 block text-sm font-medium text-theme-primary'>
              지금 내 관심사와 이 책이 어떻게 연결되는지
            </span>
            <textarea
              value={interestConnection}
              onChange={(e) => setInterestConnection(e.target.value)}
              rows={3}
              className='w-full rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-2 text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
              placeholder='관심사·질문·상황 중 편한 대로 적어 보세요.'
            />
          </label>
        </div>

        <p className='mt-4 text-xs text-theme-tertiary'>미리보기: {preview}</p>

        <div className='mt-8 flex flex-col gap-2 sm:flex-row'>
          <button
            type='button'
            disabled={saving}
            onClick={handleSaveAndContinue}
            className='flex-1 rounded-xl bg-accent-theme px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary disabled:opacity-50'
          >
            {saving ? "저장 중…" : "저장하고 질문 하나 적기"}
          </button>
          <button
            type='button'
            disabled={saving}
            onClick={handleSaveAndBack}
            className='flex-1 rounded-xl border border-theme-tertiary bg-theme-secondary px-4 py-3 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary/40 disabled:opacity-50'
          >
            저장만 하고 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
