"use client"

import { useState, useEffect } from "react"
import { PenSquare, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { Quote } from "@/types/content"
import { BookService } from "@/services/bookService"
import { QuoteService } from "@/services/quoteService"
import { useAuth } from "@/contexts/AuthContext"
import QuoteCard from "@/components/QuoteCard"
import QuoteModal from "@/components/QuoteModal"
import CommentSection from "@/components/CommentSection"
import ConfirmModal from "@/components/ConfirmModal"
import { ApiError } from "@/lib/apiClient"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string; quoteId: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
    quoteId: string
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    params.then((resolved) => setResolvedParams(resolved))
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [bookData, quoteData] = await Promise.all([
          BookService.getBook(resolvedParams.id),
          QuoteService.getQuote(resolvedParams.quoteId),
        ])

        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }
        if (!quoteData || quoteData.bookId !== resolvedParams.id) {
          setError("구절 기록을 찾을 수 없습니다.")
          return
        }

        const isBookOwner = userUid === resolvedParams.user_id
        if (!quoteData.isPublic && !isBookOwner) {
          setError("이 구절 기록은 비공개입니다.")
          return
        }

        setBook(bookData)
        setQuote(quoteData)
      } catch (e) {
        if (e instanceof ApiError) setError(e.message)
        else setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [resolvedParams, userUid])

  const isOwner = userUid === quote?.user_id

  if (isLoading) {
    return <GenericRouteSkeleton rows={5} />
  }

  if (error || !book || !quote) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <PenSquare className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary mb-4'>
            {error ?? "구절 기록을 찾을 수 없습니다."}
          </p>
          <button
            onClick={() =>
              router.push(
                resolvedParams
                  ? `/book/${resolvedParams.id}/${resolvedParams.user_id}`
                  : "/"
              )
            }
            className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  const bookBase = `/book/${resolvedParams!.id}/${resolvedParams!.user_id}`

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-4'>
        <BookSubpageHeader
          pageTitle='구절 기록'
          contextTitle={book.title}
          fallbackPath={`${bookBase}/quotes`}
          trailing={
            isOwner ? (
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
                  title='수정'
                >
                  <PenSquare className='h-5 w-5 text-theme-secondary' />
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow text-red-500 hover:text-red-600'
                  title='삭제'
                >
                  <Trash2 className='h-5 w-5' />
                </button>
              </div>
            ) : null
          }
        />

        <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
          <QuoteCard
            quote={quote}
            bookTitle={book.title}
            showBookTitle={false}
            showCommentSection={false}
          />
          <CommentSection
            contentType='quote'
            contentId={quote.id}
            isPublic={true}
            initialCommentsCount={quote.commentsCount ?? 0}
          />
        </div>
      </div>

      <QuoteModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={async (quoteData) => {
          if (!quote || !resolvedParams) return
          await QuoteService.updateQuote(quote.id, quoteData)
          const updated = await QuoteService.getQuote(quote.id)
          if (updated) setQuote(updated)
          setIsEditModalOpen(false)
        }}
        bookId={resolvedParams!.id}
        bookTitle={book.title}
        tocOutline={book.tocOutline}
        existingQuote={quote}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!quote || !resolvedParams) return
          await QuoteService.deleteQuote(quote.id)
          router.push(`${bookBase}/quotes`)
        }}
        title='구절 기록 삭제'
        message='이 구절 기록을 삭제하시겠습니까? 삭제하면 달린 생각(댓글)도 모두 삭제됩니다.'
        confirmText='삭제'
        cancelText='취소'
        icon={Trash2}
      />
    </div>
  )
}
