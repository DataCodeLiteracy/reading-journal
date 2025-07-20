"use client"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      let start = Math.max(1, currentPage - 2)
      let end = Math.min(totalPages, start + maxVisiblePages - 1)

      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1)
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }

    return pages
  }

  if (totalPages <= 0) return null

  return (
    <div className='flex items-center justify-center gap-2 py-8'>
      {/* 첫 페이지로 */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className='p-2 rounded-lg text-theme-secondary hover:text-theme-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-theme-tertiary'
        title='첫 페이지'
      >
        <ChevronsLeft className='h-5 w-5' />
      </button>

      {/* 이전 페이지 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className='p-2 rounded-lg text-theme-secondary hover:text-theme-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-theme-tertiary'
        title='이전 페이지'
      >
        <ChevronLeft className='h-5 w-5' />
      </button>

      {/* 페이지 번호들 */}
      <div className='flex items-center gap-1'>
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-[40px] ${
              page === currentPage
                ? "bg-accent-theme text-white shadow-sm"
                : "text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* 다음 페이지 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className='p-2 rounded-lg text-theme-secondary hover:text-theme-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-theme-tertiary'
        title='다음 페이지'
      >
        <ChevronRight className='h-5 w-5' />
      </button>

      {/* 마지막 페이지로 */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className='p-2 rounded-lg text-theme-secondary hover:text-theme-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-theme-tertiary'
        title='마지막 페이지'
      >
        <ChevronsRight className='h-5 w-5' />
      </button>
    </div>
  )
}
