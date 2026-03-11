"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ArrowLeft,
  PenSquare,
  Plus,
  Search,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Book } from "@/types/book"
import { Quote } from "@/types/content"
import { BookService } from "@/services/bookService"
import { QuoteService } from "@/services/quoteService"
import { useAuth } from "@/contexts/AuthContext"
import QuoteCard from "@/components/QuoteCard"
import QuoteModal from "@/components/QuoteModal"
import QuoteJsonUploadModal from "@/components/QuoteJsonUploadModal"
import ConfirmModal from "@/components/ConfirmModal"
import Pagination from "@/components/Pagination"
import { ApiError } from "@/lib/apiClient"
import { Trash2 } from "lucide-react"

const ITEMS_PER_PAGE = 10

export default function BookQuotesPage({
  params,
}: {
  params: Promise<{ id: string; user_id: string }>
}) {
  const router = useRouter()
  const { userUid, userData } = useAuth()
  const [resolvedParams, setResolvedParams] = useState<{
    id: string
    user_id: string
  } | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState("")
  const [pageMin, setPageMin] = useState<string>("")
  const [pageMax, setPageMax] = useState<string>("")
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest" | "page">("recent")
  const [currentPage, setCurrentPage] = useState(1)

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [isQuoteJsonModalOpen, setIsQuoteJsonModalOpen] = useState(false)
  const [isDeleteQuoteModalOpen, setIsDeleteQuoteModalOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null)

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

        const [bookData, quotesData] = await Promise.all([
          BookService.getBook(resolvedParams.id),
          QuoteService.getBookQuotes(resolvedParams.id),
        ])

        if (!bookData) {
          setError("책을 찾을 수 없습니다.")
          return
        }

        setBook(bookData)
        setQuotes(quotesData)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("데이터를 불러오는 중 오류가 발생했습니다.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [resolvedParams])

  const filteredQuotes = useMemo(() => {
    let list = [...quotes]

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(
        (quote) =>
          quote.quoteText?.toLowerCase().includes(q) ||
          quote.thoughts?.toLowerCase().includes(q) ||
          quote.generalThoughts?.toLowerCase().includes(q)
      )
    }

    const min = pageMin.trim() ? parseInt(pageMin, 10) : null
    const max = pageMax.trim() ? parseInt(pageMax, 10) : null
    if (min != null && !Number.isNaN(min)) {
      list = list.filter((quote) => (quote.page ?? 0) >= min)
    }
    if (max != null && !Number.isNaN(max)) {
      list = list.filter((quote) => (quote.page ?? 0) <= max)
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
    } else if (sortOrder === "oldest") {
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
    } else {
      list.sort((a, b) => {
        const pa = a.page ?? 0
        const pb = b.page ?? 0
        if (pa !== pb) return pa - pb
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
  }, [quotes, searchText, pageMin, pageMax, sortOrder])

  const totalFiltered = filteredQuotes.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE))
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredQuotes.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredQuotes, currentPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  if (isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <PenSquare className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error && !book) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <PenSquare className='h-12 w-12 text-gray-400 mx-auto mb-4' />
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
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
          </div>
        )}

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
            <p className='text-sm text-theme-secondary'>구절 기록</p>
          </div>
          <div className='flex gap-2'>
            {userData?.isAdmin && (
              <button
                onClick={() => setIsQuoteJsonModalOpen(true)}
                className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
                title='구절 기록 JSON 업로드'
              >
                <Plus className='h-5 w-5 text-theme-secondary' />
              </button>
            )}
            <button
              onClick={() => {
                setEditingQuote(null)
                setIsQuoteModalOpen(true)
              }}
              className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
              title='구절 추가'
            >
              <Plus className='h-5 w-5 text-theme-secondary' />
            </button>
          </div>
        </div>

        <div className='bg-theme-secondary rounded-lg shadow-sm p-4 mb-4'>
          <div className='flex flex-col sm:flex-row gap-3'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-tertiary' />
              <input
                type='text'
                placeholder='텍스트 검색 (구절, 생각, 일반 생각)'
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value)
                  setCurrentPage(1)
                }}
                className='w-full pl-9 pr-3 py-2 rounded-lg border border-theme-tertiary bg-theme-primary text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
              />
            </div>
            <div className='flex gap-2 items-center flex-wrap'>
              <input
                type='number'
                min={0}
                placeholder='페이지 최소'
                value={pageMin}
                onChange={(e) => {
                  setPageMin(e.target.value)
                  setCurrentPage(1)
                }}
                className='w-24 px-3 py-2 rounded-lg border border-theme-tertiary bg-theme-primary text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
              />
              <span className='text-theme-tertiary'>~</span>
              <input
                type='number'
                min={0}
                placeholder='페이지 최대'
                value={pageMax}
                onChange={(e) => {
                  setPageMax(e.target.value)
                  setCurrentPage(1)
                }}
                className='w-24 px-3 py-2 rounded-lg border border-theme-tertiary bg-theme-primary text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme'
              />
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as "recent" | "oldest" | "page")
                  setCurrentPage(1)
                }}
                className='px-3 py-2 rounded-lg border border-theme-tertiary bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
              >
                <option value='recent'>최신순</option>
                <option value='oldest'>오래된순</option>
                <option value='page'>페이지순</option>
              </select>
            </div>
          </div>
          <p className='text-xs text-theme-tertiary mt-2'>
            검색 결과: {totalFiltered}개 (전체 {quotes.length}개)
          </p>
        </div>

        {paginatedQuotes.length === 0 ? (
          <div className='text-center py-12'>
            <PenSquare className='h-16 w-16 text-gray-400 mx-auto mb-4' />
            <p className='text-theme-secondary mb-4'>
              {filteredQuotes.length === 0 && quotes.length > 0
                ? "검색 조건에 맞는 구절이 없습니다."
                : "아직 구절 기록이 없습니다."}
            </p>
            {(searchText || pageMin || pageMax) && quotes.length > 0 ? (
              <button
                onClick={() => {
                  setSearchText("")
                  setPageMin("")
                  setPageMax("")
                  setCurrentPage(1)
                }}
                className='px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg hover:bg-theme-tertiary/80 transition-colors'
              >
                검색 초기화
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingQuote(null)
                  setIsQuoteModalOpen(true)
                }}
                className='inline-flex items-center gap-2 px-4 py-2 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-lg transition-colors'
              >
                <Plus className='h-4 w-4' />
                구절 기록 추가하기
              </button>
            )}
          </div>
        ) : (
          <>
            <div className='space-y-3'>
              {paginatedQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  bookTitle={book.title}
                  onEdit={(q) => {
                    setEditingQuote(q)
                    setIsQuoteModalOpen(true)
                  }}
                  onDelete={(quoteId) => {
                    setQuoteToDelete(quoteId)
                    setIsDeleteQuoteModalOpen(true)
                  }}
                />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalFiltered}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </>
        )}

        <QuoteModal
          isOpen={isQuoteModalOpen}
          onClose={() => {
            setIsQuoteModalOpen(false)
            setEditingQuote(null)
          }}
          onSave={async (quoteData) => {
            if (!userUid || !resolvedParams) return
            try {
              setError(null)
              if (editingQuote) {
                await QuoteService.updateQuote(editingQuote.id, {
                  ...quoteData,
                  user_id: userUid,
                })
              } else {
                await QuoteService.createQuote({
                  ...quoteData,
                  user_id: userUid,
                })
              }
              const updated = await QuoteService.getBookQuotes(resolvedParams.id)
              setQuotes(updated)
              setIsQuoteModalOpen(false)
              setEditingQuote(null)
            } catch (err) {
              if (err instanceof ApiError) setError(err.message)
              else setError("구절 기록을 저장하는 중 오류가 발생했습니다.")
            }
          }}
          bookId={resolvedParams?.id || ""}
          bookTitle={book.title}
          existingQuote={editingQuote}
        />

        <ConfirmModal
          isOpen={isDeleteQuoteModalOpen}
          onClose={() => {
            setIsDeleteQuoteModalOpen(false)
            setQuoteToDelete(null)
          }}
          onConfirm={async () => {
            if (!quoteToDelete || !resolvedParams) return
            try {
              setError(null)
              await QuoteService.deleteQuote(quoteToDelete)
              const updated = await QuoteService.getBookQuotes(resolvedParams.id)
              setQuotes(updated)
              setIsDeleteQuoteModalOpen(false)
              setQuoteToDelete(null)
            } catch (err) {
              if (err instanceof ApiError) setError(err.message)
              else setError("구절 기록을 삭제하는 중 오류가 발생했습니다.")
            }
          }}
          title='구절 기록 삭제'
          message='이 구절 기록을 삭제하시겠습니까?'
          confirmText='삭제'
          cancelText='취소'
          icon={Trash2}
        />

        <QuoteJsonUploadModal
          isOpen={isQuoteJsonModalOpen}
          onClose={() => setIsQuoteJsonModalOpen(false)}
          onSuccess={async () => {
            if (!resolvedParams) return
            const updated = await QuoteService.getBookQuotes(resolvedParams.id)
            setQuotes(updated)
          }}
          bookId={resolvedParams?.id || ""}
          userId={userUid || ""}
        />
      </div>
    </div>
  )
}
