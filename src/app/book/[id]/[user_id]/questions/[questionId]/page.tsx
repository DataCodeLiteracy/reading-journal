"use client"

import { useState, useEffect } from "react"
import { HelpCircle, PenSquare, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { BookQuestion } from "@/types/question"
import { BookService } from "@/services/bookService"
import { QuestionService } from "@/services/questionService"
import { useAuth } from "@/contexts/AuthContext"
import QuestionCard from "@/components/QuestionCard"
import QuestionEditModal from "@/components/QuestionEditModal"
import CommentSection from "@/components/CommentSection"
import ConfirmModal from "@/components/ConfirmModal"
import { LikeService } from "@/services/likeService"
import { ApiError } from "@/lib/apiClient"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"

export default function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string; questionId: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
    questionId: string
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [question, setQuestion] = useState<BookQuestion | null>(null)
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
        const [bookData, questionData] = await Promise.all([
          BookService.getBook(resolvedParams.id),
          QuestionService.getQuestion(resolvedParams.questionId),
        ])

        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }
        if (!questionData || questionData.bookId !== resolvedParams.id) {
          setError("질문을 찾을 수 없습니다.")
          return
        }

        const isPublic = (questionData as { isPublic?: boolean }).isPublic
        const isBookOwner = userUid === resolvedParams.user_id
        if (!isPublic && !isBookOwner) {
          setError("이 질문은 비공개입니다.")
          return
        }

        setBook(bookData)
        if (isPublic) {
          const count = await LikeService.getLikesCount("question", questionData.id)
          setQuestion({ ...questionData, likesCount: count } as BookQuestion)
        } else {
          setQuestion(questionData)
        }
      } catch (e) {
        if (e instanceof ApiError) setError(e.message)
        else setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [resolvedParams, userUid])

  const isOwner = userUid === resolvedParams?.user_id

  if (isLoading) {
    return <GenericRouteSkeleton rows={5} />
  }

  if (error || !book || !question) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <HelpCircle className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary mb-4'>{error ?? "질문을 찾을 수 없습니다."}</p>
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

  const base = `/book/${resolvedParams!.id}/${resolvedParams!.user_id}`

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-4'>
        <BookSubpageHeader
          pageTitle='독서 질문'
          contextTitle={book.title}
          fallbackPath={`${base}/questions`}
          trailing={
            isOwner && question ? (
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setIsEditModalOpen(true)}
                  className='rounded-full bg-theme-secondary p-2 shadow-sm transition-shadow hover:shadow-md'
                  title='수정'
                >
                  <PenSquare className='h-5 w-5 text-theme-secondary' />
                </button>
                <button
                  type='button'
                  onClick={() => setIsDeleteModalOpen(true)}
                  className='rounded-full bg-theme-secondary p-2 text-red-500 shadow-sm transition-shadow hover:text-red-600 hover:shadow-md'
                  title='삭제'
                >
                  <Trash2 className='h-5 w-5' />
                </button>
              </div>
            ) : null
          }
        />

        <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
          <QuestionCard
            question={question}
            showChapterPath={true}
            showActions={false}
            showCommentSection={false}
          />
          <CommentSection
            contentType='question'
            contentId={question.id}
            isPublic={true}
            initialCommentsCount={(question as { commentsCount?: number }).commentsCount ?? 0}
          />
        </div>
      </div>

      {question && (
        <QuestionEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          question={question}
          onSave={async (questionId, data) => {
            await QuestionService.updateQuestion(questionId, data)
            const updated = await QuestionService.getQuestion(questionId)
            if (updated) setQuestion(updated)
            setIsEditModalOpen(false)
          }}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!question || !resolvedParams) return
          await QuestionService.deleteQuestion(question.id)
          router.push(`${base}/questions`)
        }}
        title='독서 질문 삭제'
        message='이 질문을 삭제하시겠습니까? 삭제하면 달린 생각(댓글)도 모두 삭제됩니다.'
        confirmText='삭제'
        cancelText='취소'
        icon={Trash2}
      />
    </div>
  )
}
