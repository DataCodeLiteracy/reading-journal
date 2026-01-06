"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Upload,
  Plus,
  List,
  TreePine,
  HelpCircle,
  Edit,
  Trash2,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { BookQuestion, QuestionGroup } from "@/types/question"
import { BookService } from "@/services/bookService"
import { QuestionService } from "@/services/questionService"
import { AnswerService } from "@/services/answerService"
import { useAuth } from "@/contexts/AuthContext"
import QuestionTree from "@/components/QuestionTree"
import QuestionCard from "@/components/QuestionCard"
import AnswerList from "@/components/AnswerList"
import AnswerForm from "@/components/AnswerForm"
import AudioRecorder from "@/components/AudioRecorder"
import JsonUploadModal from "@/components/JsonUploadModal"
import QuestionAddModal from "@/components/QuestionAddModal"
import QuestionEditModal from "@/components/QuestionEditModal"
import ConfirmModal from "@/components/ConfirmModal"
import { ApiError } from "@/lib/apiClient"

export default function QuestionsPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const { userUid } = useAuth()
  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [questions, setQuestions] = useState<BookQuestion[]>([])
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree")
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null)
  const [questionToEdit, setQuestionToEdit] = useState<BookQuestion | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<BookQuestion | null>(
    null
  )
  const [answerMode, setAnswerMode] = useState<"text" | "audio" | null>(null)

  useEffect(() => {
    params.then((resolved) => {
      setResolvedParams(resolved)
    })
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [bookData, questionsData] = await Promise.all([
          BookService.getBook(resolvedParams.id),
          QuestionService.getBookQuestions(resolvedParams.id),
        ])

        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }

        setBook(bookData)
        setQuestions(questionsData)

        // 질문을 목차별로 그룹화
        const groups = QuestionService.groupQuestionsByChapter(questionsData)
        setQuestionGroups(groups)
      } catch (error) {
        if (error instanceof ApiError) {
          setError(error.message)
        } else {
          setError("데이터를 불러오는 중 오류가 발생했습니다.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [resolvedParams])

  const handleQuestionClick = (question: BookQuestion): void => {
    setSelectedQuestion(question)
  }

  const handleQuestionEdit = (question: BookQuestion): void => {
    setQuestionToEdit(question)
    setIsEditModalOpen(true)
  }

  const handleQuestionAdd = async (
    questionData: Omit<BookQuestion, "id" | "created_at" | "updated_at" | "order">
  ): Promise<void> => {
    if (!resolvedParams) return

    try {
      // 기존 질문 조회하여 order 계산
      const existingQuestions = await QuestionService.getBookQuestions(resolvedParams.id)
      const maxOrder = existingQuestions.length > 0
        ? Math.max(...existingQuestions.map((q) => q.order))
        : 0

      const questionToCreate: Omit<
        BookQuestion,
        "id" | "created_at" | "updated_at"
      > = {
        ...questionData,
        order: maxOrder + 1,
      }

      await QuestionService.createQuestion(questionToCreate)

      // 질문 목록 새로고침
      const updatedQuestions = await QuestionService.getBookQuestions(resolvedParams.id)
      setQuestions(updatedQuestions)
      const groups = QuestionService.groupQuestionsByChapter(updatedQuestions)
      setQuestionGroups(groups)
    } catch (error) {
      console.error("Error adding question:", error)
      throw error
    }
  }

  const handleQuestionUpdate = async (
    questionId: string,
    questionData: Partial<Omit<BookQuestion, "id" | "created_at" | "updated_at" | "bookId" | "order">>
  ): Promise<void> => {
    if (!resolvedParams) return

    try {
      await QuestionService.updateQuestion(questionId, questionData)

      // 질문 목록 새로고침
      const updatedQuestions = await QuestionService.getBookQuestions(resolvedParams.id)
      setQuestions(updatedQuestions)
      const groups = QuestionService.groupQuestionsByChapter(updatedQuestions)
      setQuestionGroups(groups)

      // 선택된 질문도 업데이트
      if (selectedQuestion && selectedQuestion.id === questionId) {
        const updatedQuestion = updatedQuestions.find((q) => q.id === questionId)
        if (updatedQuestion) {
          setSelectedQuestion(updatedQuestion)
        }
      }
    } catch (error) {
      console.error("Error updating question:", error)
      throw error
    }
  }

  const handleQuestionDelete = (questionId: string): void => {
    setQuestionToDelete(questionId)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteQuestion = async (): Promise<void> => {
    if (!questionToDelete) return

    try {
      await QuestionService.deleteQuestion(questionToDelete)
      setQuestions((prev) => prev.filter((q) => q.id !== questionToDelete))
      setQuestionGroups((prev) => {
        const removeQuestionFromGroups = (
          groups: QuestionGroup[]
        ): QuestionGroup[] => {
          return groups
            .map((group) => {
              const filteredQuestions = group.questions.filter(
                (q) => q.id !== questionToDelete
              )
              const filteredSubGroups = group.subGroups
                ? removeQuestionFromGroups(group.subGroups)
                : undefined

              return {
                ...group,
                questions: filteredQuestions,
                subGroups: filteredSubGroups,
              }
            })
            .filter(
              (group) =>
                group.questions.length > 0 ||
                (group.subGroups && group.subGroups.length > 0)
            )
        }
        return removeQuestionFromGroups(prev)
      })
      setQuestionToDelete(null)
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error("Error deleting question:", error)
      setError("질문을 삭제하는 중 오류가 발생했습니다.")
    }
  }

  const handleUploadSuccess = async (): Promise<void> => {
    if (!resolvedParams) return

    try {
      const questionsData = await QuestionService.getBookQuestions(
        resolvedParams.id
      )
      setQuestions(questionsData)
      const groups = QuestionService.groupQuestionsByChapter(questionsData)
      setQuestionGroups(groups)
    } catch (error) {
      console.error("Error reloading questions:", error)
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <HelpCircle className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error && !book) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <HelpCircle className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <p className='text-theme-secondary mb-4'>{error}</p>
          <button
            onClick={() => router.push("/")}
            className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (!book) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient pb-20'>
      <div className='container mx-auto px-4 py-4'>
        {/* 에러 메시지 */}
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <X className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() =>
              router.push(
                `/book/${resolvedParams?.id}/${resolvedParams?.user_id}`
              )
            }
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <div className='flex-1'>
            <h1 className='text-xl font-semibold text-theme-primary'>
              {book.title}
            </h1>
            <p className='text-sm text-theme-secondary'>독서 질문</p>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
              title='JSON 업로드'
            >
              <Upload className='h-5 w-5 text-theme-secondary' />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
              title='질문 추가'
            >
              <Plus className='h-5 w-5 text-theme-secondary' />
            </button>
          </div>
        </div>

        {/* 뷰 모드 전환 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mb-4'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-theme-primary'>
              질문 목록 ({questions.length}개)
            </h2>
            <div className='flex gap-2'>
              <button
                onClick={() => setViewMode("tree")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "tree"
                    ? "bg-accent-theme text-white"
                    : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
                }`}
                title='목차별 트리 뷰'
              >
                <TreePine className='h-4 w-4' />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-accent-theme text-white"
                    : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
                }`}
                title='전체 목록 뷰'
              >
                <List className='h-4 w-4' />
              </button>
            </div>
          </div>

          {/* 질문 목록 */}
          {questions.length === 0 ? (
            <div className='text-center py-12'>
              <HelpCircle className='h-16 w-16 text-gray-400 mx-auto mb-4' />
              <p className='text-theme-secondary mb-4'>
                아직 질문이 없습니다.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
              >
                JSON 업로드
              </button>
            </div>
          ) : viewMode === "tree" ? (
            <QuestionTree
              groups={questionGroups}
              onQuestionClick={handleQuestionClick}
              onQuestionEdit={handleQuestionEdit}
              onQuestionDelete={handleQuestionDelete}
              showActions={true}
              defaultExpanded={true}
            />
          ) : (
            <div className='space-y-3'>
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onEdit={handleQuestionEdit}
                  onDelete={handleQuestionDelete}
                  showChapterPath={true}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* 선택된 질문 상세 (추후 구현) */}
        {selectedQuestion && (
          <div className='bg-theme-secondary rounded-lg shadow-sm p-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-theme-primary'>
                질문 상세
              </h3>
              <button
                onClick={() => setSelectedQuestion(null)}
                className='p-2 text-theme-secondary hover:bg-theme-tertiary rounded-full transition-colors'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
            <QuestionCard
              question={selectedQuestion}
              showChapterPath={true}
              showActions={false}
            />

            {/* 답변 섹션 */}
            {resolvedParams && userUid && (
              <div className='mt-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-md font-semibold text-theme-primary'>
                    답변 목록
                  </h4>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setAnswerMode(answerMode === "text" ? null : "text")}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        answerMode === "text"
                          ? "bg-accent-theme text-white"
                          : "bg-theme-tertiary text-theme-primary hover:bg-theme-tertiary/80"
                      }`}
                    >
                      텍스트 답변
                    </button>
                    <button
                      onClick={() => setAnswerMode(answerMode === "audio" ? null : "audio")}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        answerMode === "audio"
                          ? "bg-accent-theme text-white"
                          : "bg-theme-tertiary text-theme-primary hover:bg-theme-tertiary/80"
                      }`}
                    >
                      오디오 답변
                    </button>
                  </div>
                </div>

                {/* 답변 목록 */}
                <AnswerList
                  questionId={selectedQuestion.id}
                  userId={userUid}
                  onAnswerDeleted={() => {
                    // AnswerList 내부에서 자동으로 loadAnswers() 호출됨
                  }}
                  showActions={true}
                />

                {/* 텍스트 답변 작성 폼 */}
                {answerMode === "text" && (
                  <div className='bg-theme-tertiary rounded-lg p-4'>
                    <AnswerForm
                      questionId={selectedQuestion.id}
                      onSubmit={async (answerText: string): Promise<void> => {
                        if (!resolvedParams || !userUid) return

                        try {
                          await AnswerService.createTextAnswer(
                            selectedQuestion.id,
                            resolvedParams.id,
                            userUid,
                            answerText
                          )
                          setAnswerMode(null)
                          // 답변 목록은 AnswerList 내부에서 자동 새로고침됨
                        } catch (error) {
                          console.error("Error creating text answer:", error)
                          throw error
                        }
                      }}
                      onCancel={() => setAnswerMode(null)}
                      placeholder='답변을 입력하세요...'
                    />
                  </div>
                )}

                {/* 오디오 답변 작성 폼 */}
                {answerMode === "audio" && (
                  <div className='bg-theme-tertiary rounded-lg p-4'>
                    <AudioRecorder
                      onRecordingComplete={async (
                        audioBlob: Blob,
                        transcript?: string
                      ): Promise<void> => {
                        if (!resolvedParams || !userUid) return

                        try {
                          await AnswerService.createAudioAnswer(
                            selectedQuestion.id,
                            resolvedParams.id,
                            userUid,
                            audioBlob,
                            transcript
                          )
                          setAnswerMode(null)
                          // 답변 목록은 AnswerList 내부에서 자동 새로고침됨
                        } catch (error) {
                          console.error("Error creating audio answer:", error)
                          throw error
                        }
                      }}
                      onCancel={() => setAnswerMode(null)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* JSON 업로드 모달 */}
        {resolvedParams && (
          <JsonUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onSuccess={handleUploadSuccess}
            bookId={resolvedParams.id}
            bookTitle={book.title}
          />
        )}

        {/* 질문 추가 모달 */}
        {resolvedParams && (
          <QuestionAddModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleQuestionAdd}
            bookId={resolvedParams.id}
            existingQuestions={questions}
          />
        )}

        {/* 질문 수정 모달 */}
        {questionToEdit && (
          <QuestionEditModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setQuestionToEdit(null)
            }}
            onSave={handleQuestionUpdate}
            question={questionToEdit}
          />
        )}

        {/* 질문 삭제 확인 모달 */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setQuestionToDelete(null)
          }}
          onConfirm={confirmDeleteQuestion}
          title='질문 삭제'
          message='이 질문을 삭제하시겠습니까?'
          confirmText='삭제'
          cancelText='취소'
          icon={Trash2}
        />
      </div>
    </div>
  )
}

