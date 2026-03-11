"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  BookOpen,
  Save,
  Lock,
  Globe,
  AlertCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { Critique } from "@/types/content"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { CritiqueService } from "@/services/critiqueService"
import { ApiError } from "@/lib/apiClient"

export default function EditCritiquePage({
  params,
}: {
  params: Promise<{ id: string; user_id: string; critiqueId: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
    critiqueId: string
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [critique, setCritique] = useState<Critique | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    params.then((resolved) => setResolvedParams(resolved))
  }, [params])

  useEffect(() => {
    if (!resolvedParams || userUid !== resolvedParams.user_id) return

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [bookData, critiqueData] = await Promise.all([
          BookService.getBook(resolvedParams.id),
          CritiqueService.getCritique(resolvedParams.critiqueId),
        ])
        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }
        if (!critiqueData || critiqueData.bookId !== resolvedParams.id || critiqueData.user_id !== userUid) {
          setError("서평을 찾을 수 없거나 수정할 수 없습니다.")
          return
        }
        setBook(bookData)
        setCritique(critiqueData)
        setTitle(critiqueData.title || "")
        setContent(critiqueData.content || "")
        setIsPublic(critiqueData.isPublic || false)
      } catch (e) {
        if (e instanceof ApiError) setError(e.message)
        else setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [resolvedParams, userUid])

  const handleSave = async () => {
    if (!critique || !content.trim() || !resolvedParams) return

    setIsSaving(true)
    setError(null)
    try {
      await CritiqueService.updateCritique(critique.id, {
        title: title.trim() || undefined,
        content: content.trim(),
        isPublic,
      })
      router.push(`/book/${resolvedParams.id}/${resolvedParams.user_id}/critiques/${resolvedParams.critiqueId}`)
    } catch (e) {
      if (e instanceof ApiError) setError(e.message)
      else setError("서평을 저장하는 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if ((error && !book) || !book || !critique) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary mb-4'>{error ?? "서평을 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.push(resolvedParams ? `/book/${resolvedParams.id}/${resolvedParams.user_id}` : "/")}
            className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-4'>
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2'>
            <AlertCircle className='h-5 w-5 text-red-500 flex-shrink-0' />
            <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
          </div>
        )}

        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.push(`/book/${resolvedParams!.id}/${resolvedParams!.user_id}/critiques/${resolvedParams!.critiqueId}`)}
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <div className='flex-1 min-w-0'>
            <h1 className='text-xl font-bold text-theme-primary'>서평 수정</h1>
            <p className='text-sm text-theme-secondary truncate'>{book.title}</p>
          </div>
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <h2 className='text-lg font-semibold text-theme-primary mb-1'>{book.title}</h2>
          <p className='text-theme-secondary text-sm'>{book.author || "저자 미상"}</p>
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <label className='block text-sm font-medium text-theme-primary mb-2'>제목 (선택)</label>
          <input
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='서평 제목을 입력하세요...'
            className='w-full px-4 py-3 border border-theme-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary'
          />
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <label className='block text-sm font-medium text-theme-primary mb-2'>
            서평 내용 <span className='text-red-500'>*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder='책에 대한 깊이 있는 분석과 평가를 작성해보세요...'
            rows={12}
            className='w-full px-4 py-3 border border-theme-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-theme bg-theme-primary text-theme-primary placeholder:text-theme-tertiary resize-none'
          />
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              {isPublic ? (
                <Globe className='h-5 w-5 text-blue-500' />
              ) : (
                <Lock className='h-5 w-5 text-gray-400' />
              )}
              <div>
                <span className='text-sm font-medium text-theme-primary'>공개하기</span>
                <p className='text-xs text-theme-tertiary'>
                  {isPublic ? "다른 독서자들이 이 서평을 볼 수 있습니다" : "나만 볼 수 있습니다"}
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={() => router.push(`/book/${resolvedParams!.id}/${resolvedParams!.user_id}/critiques/${resolvedParams!.critiqueId}`)}
            className='flex-1 px-4 py-3 border border-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-tertiary transition-colors'
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className='flex-1 flex items-center justify-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors'
          >
            <Save className='h-5 w-5' />
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  )
}
