"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, User, FileText } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BookService } from "@/services/bookService"
import { UserService } from "@/services/userService"
import { Book } from "@/types/book"

function parseCSVLine(line: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1
      let cell = ""
      while (i < line.length && line[i] !== '"') {
        cell += line[i]
        i += 1
      }
      if (line[i] === '"') i += 1
      out.push(cell.trim())
      if (line[i] === ",") i += 1
      continue
    }
    let cell = ""
    while (i < line.length && line[i] !== ",") {
      cell += line[i]
      i += 1
    }
    out.push(cell.trim())
    if (line[i] === ",") i += 1
  }
  return out
}

function parseCSV(csvText: string): Record<string, number> {
  const firstLine = csvText.split(/\r?\n/)[0] ?? ""
  const headers = parseCSVLine(firstLine)
  const indexOf: Record<string, number> = {}
  headers.forEach((h, i) => {
    indexOf[h.trim()] = i
  })
  return indexOf
}

function mapStatus(상태: string): Book["status"] {
  const s = (상태 || "").trim()
  if (s === "읽음") return "completed"
  if (s === "읽는 중") return "reading"
  if (s === "읽기 전" || s === "선택 전") return "want-to-read"
  return "want-to-read"
}

function mapToReadThisYear(val: string): boolean {
  return (val || "").trim().toLowerCase() === "yes"
}

/** 등록여부가 true(이미 등록됨)이면 true → 해당 행은 제외 */
function isAlreadyRegistered(등록여부: string): boolean {
  const v = (등록여부 || "").trim().toLowerCase()
  if (!v) return false
  if (v === "yes" || v === "y" || v === "o" || v === "1" || v === "true") return true
  if (v === "체크" || v === "등록" || v === "✓" || v === "✔") return true
  return false
}

type UserOption = { uid: string; displayName: string | null; email: string | null }

export default function AdminBookRegisterPage() {
  const router = useRouter()
  const { loading, isLoggedIn, userData } = useAuth()
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUid, setSelectedUid] = useState("")
  const [log, setLog] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [completePopup, setCompletePopup] = useState<{ updated: number; created: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!userData?.isAdmin) return
    UserService.getAllUsersForAdmin()
      .then(setUsers)
      .catch((err) => {
        console.error("Failed to load users:", err)
        setLog((prev) => [...prev, "유저 목록을 불러오지 못했습니다."])
      })
  }, [userData?.isAdmin])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedUid.trim()) {
      setLog((prev) => [...prev, "유저를 선택한 뒤 CSV를 선택하세요."])
      return
    }

    setIsProcessing(true)
    setLog([])

    try {
      const text = await file.text()
      const indexOf = parseCSV(text)
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) {
        setLog((prev) => [...prev, "CSV에 데이터 행이 없습니다."])
        setIsProcessing(false)
        return
      }

      const userBooks = await BookService.getUserBooks(selectedUid.trim())
      const byTitle = new Map<string, Book>()
      userBooks.forEach((b) => byTitle.set(b.title.trim(), b))

      let updated = 0
      let created = 0
      let skipped = 0
      let excludedRegistered = 0

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i])
        const get = (key: string) => (indexOf[key] !== undefined ? row[indexOf[key]] ?? "" : "")

        if (isAlreadyRegistered(get("등록여부")) || isAlreadyRegistered(get("등록"))) {
          excludedRegistered += 1
          continue
        }

        const title = get("제목").trim()
        if (!title) {
          skipped += 1
          continue
        }

        const category = get("분야").trim() || undefined
        const statusFromCsv = get("상태").trim()
        const toReadVal = get("이번 년도에 읽을 책").trim()
        const author = get("저자").trim() || undefined
        const publisher = get("출판사").trim() || undefined
        const publishedDate = get("출판일").trim() || undefined
        const ratingStr = get("평점").trim()
        const rereadStr = get("회독수").trim()

        const rating = ratingStr ? Math.min(5, Math.max(0, Number(ratingStr) || 0)) : 0
        const rereadCount = rereadStr ? Math.max(0, parseInt(rereadStr, 10) || 0) : 0
        const toReadThisYear = toReadVal ? mapToReadThisYear(toReadVal) : undefined

        const existing = byTitle.get(title)

        if (existing) {
          const updateData: Partial<Book> = {
            title,
            status: mapStatus(statusFromCsv),
            rating,
            rereadCount: rereadCount || 0,
          }
          if (category !== undefined) updateData.category = category || undefined
          if (toReadThisYear !== undefined) updateData.toReadThisYear = toReadThisYear
          if (author !== undefined) updateData.author = author || undefined
          if (publisher !== undefined) updateData.publisher = publisher || undefined
          if (publishedDate !== undefined) updateData.publishedDate = publishedDate || undefined

          await BookService.updateBook(existing.id, updateData)
          updated += 1
          setLog((prev) => [...prev, `업데이트: ${title}`])
        } else {
          const newBook: Omit<Book, "id"> = {
            user_id: selectedUid.trim(),
            title,
            status: "want-to-read",
            rating,
            hasStartedReading: false,
            rereadCount: rereadCount || 0,
          }
          if (author) newBook.author = author
          if (category) newBook.category = category
          if (toReadThisYear !== undefined) newBook.toReadThisYear = toReadThisYear
          if (publisher) newBook.publisher = publisher
          if (publishedDate) newBook.publishedDate = publishedDate

          await BookService.createBook(newBook)
          created += 1
          byTitle.set(title, { ...newBook, id: "" })
          setLog((prev) => [...prev, `등록: ${title}`])
        }
      }

      setLog((prev) => [
        ...prev,
        `완료: 업데이트 ${updated}건, 신규 등록 ${created}건, 제목 없음 제외 ${skipped}건, 등록여부 제외 ${excludedRegistered}건`,
      ])
      setCompletePopup({ updated, created })
    } catch (err) {
      console.error(err)
      setLog((prev) => [...prev, `오류: ${err instanceof Error ? err.message : String(err)}`])
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (loading || !isLoggedIn) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <p className='text-theme-secondary'>로딩 중...</p>
      </div>
    )
  }
  if (!userData?.isAdmin) {
    router.push("/mypage")
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.push("/admin")}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            관리자 페이지로 돌아가기
          </button>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            책 등록 (CSV)
          </h1>
          <p className='text-theme-secondary text-sm'>
            유저를 선택한 뒤 노션 CSV를 업로드하면, 제목이 같으면 업데이트, 없으면 새로 등록됩니다. 등록여부가 체크된 행은 제외됩니다. 신규 등록 시 상태는 읽고 싶은 책으로 설정됩니다.
          </p>
        </header>

        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-4'>
          <div className='flex items-center gap-2 mb-4'>
            <User className='h-5 w-5 text-theme-tertiary' />
            <label className='font-medium text-theme-primary'>유저 선택</label>
          </div>
          <select
            value={selectedUid}
            onChange={(e) => setSelectedUid(e.target.value)}
            className='w-full max-w-md rounded-lg border border-theme-tertiary bg-theme-primary px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-theme'
          >
            <option value=''>유저를 선택하세요</option>
            {users.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.displayName || u.email || u.uid}
              </option>
            ))}
          </select>
        </div>

        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-4'>
          <div className='flex items-center gap-2 mb-4'>
            <FileText className='h-5 w-5 text-theme-tertiary' />
            <label className='font-medium text-theme-primary'>CSV 파일</label>
          </div>
          <p className='text-sm text-theme-secondary mb-3'>
            CSV에는 제목, 분야, 상태, 이번 년도에 읽을 책, 저자, 출판사, 출판일, 평점, 회독수 컬럼이 포함되어야 합니다. 등록여부가 체크된 행은 제외됩니다.
          </p>
          <input
            ref={fileInputRef}
            type='file'
            accept='.csv'
            onChange={handleFile}
            disabled={isProcessing || !selectedUid.trim()}
            className='block w-full max-w-md text-sm text-theme-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-accent-theme file:px-4 file:py-2 file:text-white file:font-medium'
          />
          {isProcessing && <p className='mt-2 text-sm text-theme-tertiary'>처리 중...</p>}
        </div>

        {log.length > 0 && (
          <div className='bg-theme-secondary rounded-lg p-4 shadow-sm'>
            <h3 className='font-medium text-theme-primary mb-2'>처리 로그</h3>
            <ul className='text-sm text-theme-secondary space-y-1 max-h-60 overflow-y-auto'>
              {log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {completePopup && (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50'
            role='dialog'
            aria-modal='true'
            aria-labelledby='complete-popup-title'
          >
            <div className='w-full max-w-sm rounded-xl bg-theme-secondary p-5 shadow-lg'>
              <h2 id='complete-popup-title' className='text-lg font-bold text-theme-primary mb-2'>
                처리 완료
              </h2>
              <p className='text-theme-secondary text-sm mb-4'>
                업데이트 {completePopup.updated}건, 신규 등록 {completePopup.created}건이 완료되었습니다.
              </p>
              <button
                onClick={() => setCompletePopup(null)}
                className='w-full py-2.5 rounded-lg bg-accent-theme text-white font-medium'
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
