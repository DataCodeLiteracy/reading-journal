"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  List,
  TreePine,
  HelpCircle,
  Edit,
  Trash2,
  X,
  Search,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { BookQuestion, QuestionGroup } from "@/types/question"
import { BookService } from "@/services/bookService"
import { QuestionService } from "@/services/questionService"
import { useAuth } from "@/contexts/AuthContext"
import QuestionTree from "@/components/QuestionTree"
import QuestionCard from "@/components/QuestionCard"
import QuestionAddModal from "@/components/QuestionAddModal"
import QuestionEditModal from "@/components/QuestionEditModal"
import ConfirmModal from "@/components/ConfirmModal"
import Pagination from "@/components/Pagination"
import { ApiError } from "@/lib/apiClient"
import { GenericRouteSkeleton } from "@/components/skeletons"
import { BookSubpageHeader } from "@/components/BookSubpageHeader"
import Select, { type SelectOption } from "@/components/Select"
import {
  clearPostCompleteReadingFlow,
  getPostCompleteReadingStage,
} from "@/utils/postCompleteReadingFlow"

const QUESTION_SORT_OPTIONS: SelectOption<"recent" | "oldest">[] = [
  { value: "recent", label: "최신순" },
  { value: "oldest", label: "오래된순" },
]

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [questionAddBanner, setQuestionAddBanner] = useState<string | null>(
    null,
  )
  const [addModalReadingPhase, setAddModalReadingPhase] = useState<
    BookQuestion["readingPhase"] | undefined
  >(undefined)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null)
  const [questionToEdit, setQuestionToEdit] = useState<BookQuestion | null>(null)

  const [searchText, setSearchText] = useState("")
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

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

        // 질문을 목차별로 그룹화 (전체 목록 기준)
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

  const filteredQuestions = useMemo(() => {
    let list = [...questions]
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(
        (question) =>
          question.questionText?.toLowerCase().includes(q) ||
          (question.chapterPath?.join(" ") || "").toLowerCase().includes(q)
      )
    }
    if (sortOrder === "recent") {
      list.sort((a, b) => {
        const at =
          a.created_at instanceof Date
            ? a.created_at.getTime()
            : a.created_at
              ? new Date(a.created_at).getTime()
              : 0
        const bt =
          b.created_at instanceof Date
            ? b.created_at.getTime()
            : b.created_at
              ? new Date(b.created_at).getTime()
              : 0
        return bt - at
      })
    } else {
      list.sort((a, b) => {
        const at =
          a.created_at instanceof Date
            ? a.created_at.getTime()
            : a.created_at
              ? new Date(a.created_at).getTime()
              : 0
        const bt =
          b.created_at instanceof Date
            ? b.created_at.getTime()
            : b.created_at
              ? new Date(b.created_at).getTime()
              : 0
        return at - bt
      })
    }
    return list
  }, [questions, searchText, sortOrder])

  const totalFiltered = filteredQuestions.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE))
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredQuestions.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredQuestions, currentPage])

  const paginatedGroups = useMemo(() => {
    return QuestionService.groupQuestionsByChapter(paginatedQuestions)
  }, [paginatedQuestions])

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!resolvedParams || typeof window === "undefined") return
    const u = new URL(window.location.href)
    if (u.searchParams.get("postCompleteFlow") !== "1") return
    u.searchParams.delete("postCompleteFlow")
    const qs = u.searchParams.toString()
    window.history.replaceState({}, "", u.pathname + (qs ? `?${qs}` : ""))
  }, [resolvedParams])

  useEffect(() => {
    if (!resolvedParams || typeof window === "undefined") return
    const u = new URL(window.location.href)
    if (u.searchParams.get("from") !== "pre-reading") return
    setQuestionAddBanner(
      "읽으면서 생각해보고 싶은 질문을 하나 적어보세요. (읽기 준비에 적어 둔 내용과 연결해 보셔도 좋아요.)",
    )
    setAddModalReadingPhase("pre")
    setIsAddModalOpen(true)
    u.searchParams.delete("from")
    const qs = u.searchParams.toString()
    window.history.replaceState({}, "", u.pathname + (qs ? `?${qs}` : ""))
  }, [resolvedParams])

  const openAddQuestionModal = () => {
    setQuestionAddBanner(null)
    setAddModalReadingPhase(undefined)
    setIsAddModalOpen(true)
  }

  const openPostCompleteQuestionModal = () => {
    setQuestionAddBanner(
      "완독 이후 · 독서 질문: 책이 던지는 핵심 질문을 하나 적어 보세요. 아래「질문과 함께 나의 생각」에 왜 이 질문을 남기는지 덧붙일 수 있습니다. 지금 넘어가도 이 목록에서 나중에 추가할 수 있어요.",
    )
    setAddModalReadingPhase("post")
    setIsAddModalOpen(true)
  }

  const dismissPostCompleteQuestionGuide = () => {
    if (!resolvedParams) return
    clearPostCompleteReadingFlow(resolvedParams.id)
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href)
      u.searchParams.delete("postCompleteFlow")
      const qs = u.searchParams.toString()
      window.history.replaceState({}, "", u.pathname + (qs ? `?${qs}` : ""))
    }
  }

  const closeAddQuestionModal = () => {
    setIsAddModalOpen(false)
    setQuestionAddBanner(null)
    setAddModalReadingPhase(undefined)
  }

  const handleQuestionClick = (question: BookQuestion): void => {
    if (resolvedParams) {
      router.push(
        `/book/${resolvedParams.id}/${resolvedParams.user_id}/questions/${question.id}`
      )
    }
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
      if (getPostCompleteReadingStage(resolvedParams.id) === "questions") {
        clearPostCompleteReadingFlow(resolvedParams.id)
      }
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

  if (isLoading) {
    return <GenericRouteSkeleton rows={5} />
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

  const base = resolvedParams
    ? `/book/${resolvedParams.id}/${resolvedParams.user_id}`
    : ""

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

        <BookSubpageHeader
          pageTitle='독서 질문'
          contextTitle={book.title}
          fallbackPath={base}
          trailing={
            <button
              type='button'
              onClick={openAddQuestionModal}
              className='rounded-full bg-theme-secondary p-2 shadow-sm transition-shadow hover:shadow-md'
              title='질문 추가'
            >
              <Plus className='h-5 w-5 text-theme-secondary' />
            </button>
          }
        />

        {resolvedParams &&
        book.status === "completed" &&
        getPostCompleteReadingStage(resolvedParams.id) === "questions" ? (
          <div className='mb-4 rounded-lg border border-violet-200 bg-violet-50/90 p-4 dark:border-violet-800/50 dark:bg-violet-950/30'>
            <p className='text-sm font-semibold text-theme-primary'>
              완독 이후 · 독서 질문
            </p>
            <p className='mt-2 text-sm leading-relaxed text-theme-secondary'>
              이 책이 던지는 핵심 질문을 하나 떠올려 적어 보세요. 질문만 적지 말고, 같은
              화면의「질문과 함께 나의 생각」에 왜 이 질문을 남기는지 덧붙이면 나중에
              읽을 때 훨씬 도움이 됩니다. 지금 건너뛰어도 언제든 이 목록에서 추가할 수
              있어요.
            </p>
            <div className='mt-3 flex flex-wrap gap-2'>
              <button
                type='button'
                onClick={openPostCompleteQuestionModal}
                className='rounded-lg bg-accent-theme px-3 py-2 text-sm font-medium text-white hover:bg-accent-theme-secondary'
              >
                질문 쓰기
              </button>
              <button
                type='button'
                onClick={dismissPostCompleteQuestionGuide}
                className='rounded-lg border border-theme-tertiary bg-theme-secondary px-3 py-2 text-sm font-medium text-theme-primary hover:bg-theme-tertiary/60'
              >
                나중에 할게요
              </button>
            </div>
          </div>
        ) : null}

        {/* 뷰 모드 전환 */}
        <div className='bg-theme-secondary rounded-lg shadow-sm p-3 sm:p-4 mb-4'>
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <h2 className='min-w-0 break-words text-base font-semibold leading-snug text-theme-primary sm:text-lg'>
              질문 목록 ({questions.length}개)
              {searchText && (
                <span className='block font-normal text-theme-tertiary sm:inline'>
                  {" "}
                  · 검색 결과 {totalFiltered}개
                </span>
              )}
            </h2>
            <div className='flex shrink-0 gap-2 self-start sm:self-center'>
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
            <div className='mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch'>
              <div className='relative min-w-0 flex-1'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-tertiary' />
                <input
                  type='text'
                  placeholder='텍스트 검색 (질문 내용, 목차)'
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value)
                    setCurrentPage(1)
                  }}
                  className='w-full pl-9 pr-3 py-2 rounded-lg border border-theme-tertiary bg-theme-primary text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
                />
              </div>
              <div className='flex w-full shrink-0 items-center gap-2 sm:w-44 sm:min-w-[11rem]'>
                <span className='hidden text-sm text-theme-tertiary sm:inline'>
                  정렬
                </span>
                <Select
                  value={sortOrder}
                  onChange={(v) => {
                    setSortOrder(v)
                    setCurrentPage(1)
                  }}
                  options={QUESTION_SORT_OPTIONS}
                  variant='toolbar'
                  aria-label='정렬'
                />
              </div>
            </div>

          {/* 질문 목록 */}
          {questions.length === 0 ? (
            <div className='text-center py-12'>
              <HelpCircle className='h-16 w-16 text-gray-400 mx-auto mb-4' />
              <p className='text-theme-secondary mb-4'>
                아직 질문이 없습니다.
              </p>
              <div className='flex flex-wrap justify-center gap-2'>
                <button
                  onClick={openAddQuestionModal}
                  className='px-4 py-2 bg-accent-theme text-white rounded-lg hover:bg-accent-theme-secondary transition-colors'
                >
                  질문 추가하기
                </button>
              </div>
            </div>
          ) : totalFiltered === 0 ? (
            <div className='text-center py-12'>
              <p className='text-theme-secondary mb-4'>검색 조건에 맞는 질문이 없습니다.</p>
              <button
                onClick={() => {
                  setSearchText("")
                  setCurrentPage(1)
                }}
                className='px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-tertiary/80 transition-colors'
              >
                검색 초기화
              </button>
            </div>
          ) : (
            <>
              {viewMode === "tree" ? (
                <QuestionTree
                  groups={paginatedGroups}
                  onQuestionClick={handleQuestionClick}
                  onQuestionEdit={handleQuestionEdit}
                  onQuestionDelete={handleQuestionDelete}
                  showActions={true}
                  defaultExpanded={true}
                />
              ) : (
                <div className='space-y-4 sm:space-y-3'>
                  {paginatedQuestions.map((question: BookQuestion) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      onEdit={handleQuestionEdit}
                      onDelete={handleQuestionDelete}
                      showChapterPath={true}
                      showActions={true}
                      detailHref={resolvedParams ? `/book/${resolvedParams.id}/${resolvedParams.user_id}/questions/${question.id}` : undefined}
                    />
                  ))}
                </div>
              )}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalFiltered}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
        </div>

        {/* 질문 추가 모달 */}
        {resolvedParams && (
          <QuestionAddModal
            isOpen={isAddModalOpen}
            onClose={closeAddQuestionModal}
            onSave={handleQuestionAdd}
            bookId={resolvedParams.id}
            existingQuestions={questions}
            bannerMessage={questionAddBanner}
            defaultReadingPhase={addModalReadingPhase}
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
          message='이 질문을 삭제하시겠습니까? 삭제하면 달린 생각(댓글)도 모두 삭제됩니다.'
          confirmText='삭제'
          cancelText='취소'
          icon={Trash2}
        />
      </div>
    </div>
  )
}

