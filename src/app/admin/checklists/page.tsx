"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  ClipboardList,
  Plus,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { ChecklistService } from "@/services/checklistService"
import { SystemChecklist } from "@/types/user"
import JsonPreviewModal from "@/components/JsonPreviewModal"

export default function ChecklistsPage() {
  const router = useRouter()
  const { user, userData, loading, isLoggedIn } = useAuth()
  const [checklists, setChecklists] = useState<SystemChecklist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [jsonData, setJsonData] = useState("")
  const [selectedChecklist, setSelectedChecklist] =
    useState<SystemChecklist | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // 체크리스트 데이터 로드
  const loadChecklists = async () => {
    try {
      setIsLoading(true)
      const preReadingChecklist = await ChecklistService.getSystemChecklist(
        "pre-reading"
      )
      const longTermChecklist = await ChecklistService.getSystemChecklist(
        "long-term"
      )

      const allChecklists: SystemChecklist[] = []
      if (preReadingChecklist) allChecklists.push(preReadingChecklist)
      if (longTermChecklist) allChecklists.push(longTermChecklist)

      setChecklists(allChecklists)
    } catch (error) {
      console.error("Error loading checklists:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }

    if (!loading && isLoggedIn && userData && !userData.isAdmin) {
      router.push("/mypage")
      return
    }

    if (isLoggedIn && userData && userData.isAdmin) {
      loadChecklists()
    }
  }, [isLoggedIn, loading, userData, router])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonData(content)
        setIsModalOpen(true)
      }
      reader.readAsText(file)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonData(e.target.value)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData("text")
    setJsonData(pastedText)
    setIsModalOpen(true)
  }

  const handleJsonUpload = async () => {
    if (!jsonData.trim()) {
      setUploadMessage("JSON 데이터를 입력해주세요.")
      return
    }

    try {
      setIsUploading(true)
      setUploadMessage("")

      let checklistData: SystemChecklist
      try {
        checklistData = JSON.parse(jsonData)
      } catch (parseError) {
        setUploadMessage("올바른 JSON 형식이 아닙니다.")
        return
      }

      // 필수 필드 검증
      if (
        !checklistData.id ||
        !checklistData.type ||
        !checklistData.items ||
        !Array.isArray(checklistData.items)
      ) {
        setUploadMessage("필수 필드가 누락되었습니다. (id, type, items)")
        return
      }

      // 체크리스트 타입 검증
      if (!["pre-reading", "long-term"].includes(checklistData.type)) {
        setUploadMessage(
          "체크리스트 타입은 'pre-reading' 또는 'long-term'이어야 합니다."
        )
        return
      }

      // Firestore에 저장
      await ChecklistService.createOrUpdateSystemChecklist(checklistData)

      setUploadMessage("체크리스트가 성공적으로 업로드되었습니다!")
      setIsModalOpen(false)
      setJsonData("")

      // 목록 새로고침
      await loadChecklists()
    } catch (error) {
      console.error("Error uploading checklist:", error)
      setUploadMessage("체크리스트 업로드 중 오류가 발생했습니다.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!confirm("이 체크리스트를 삭제하시겠습니까?")) return

    try {
      await ChecklistService.deleteSystemChecklist(checklistId)
      setUploadMessage("체크리스트가 삭제되었습니다.")
      await loadChecklists()
    } catch (error) {
      console.error("Error deleting checklist:", error)
      setUploadMessage("체크리스트 삭제 중 오류가 발생했습니다.")
    }
  }

  const downloadChecklist = (checklist: SystemChecklist) => {
    const dataStr = JSON.stringify(checklist, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${checklist.type}-checklist.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getChecklistTemplate = (type: "pre-reading" | "long-term") => {
    const template = {
      id: type,
      type: type,
      version: "1.0.0",
      items:
        type === "pre-reading"
          ? [
              {
                id: "prep-1",
                title: "집중 방해 요소 제거",
                description:
                  "집중 방해 요소(슬라임, 장난감 등)를 치우고 독서에 집중할 수 있는 환경을 만들기.",
                category: "pre-reading",
              },
              {
                id: "prep-2",
                title: "아이 컨디션 점검",
                description:
                  "아이가 피곤하거나 집중 떨어질 징후가 보이면, 10분으로 유연 조정하거나 미리 읽기(가게/아침) 고려.",
                category: "pre-reading",
              },
            ]
          : [
              {
                id: "long-1",
                title: "책 접근성 확보",
                description:
                  "아이들이 어디서든 책에 접근할 수 있게 책을 미리 준비하고, 독서 환경을 조성하기.",
                category: "long-term",
              },
              {
                id: "long-2",
                title: "장기 선언 유지",
                description:
                  '"고등학생까지 매일 읽어줄게!" 다짐 상기, 아이들 앞에서 재확인하며 동기 부여.',
                category: "long-term",
              },
            ],
      updated_at: new Date(),
    }

    setJsonData(JSON.stringify(template, null, 2))
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-background flex items-center justify-center'>
        <div className='text-theme-primary'>로딩 중...</div>
      </div>
    )
  }

  if (!isLoggedIn || !userData?.isAdmin) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-background p-4 sm:p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* 헤더 */}
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => router.push("/admin")}
            className='p-2 rounded-full bg-theme-secondary shadow-sm hover:shadow-md transition-shadow'
          >
            <ArrowLeft className='h-5 w-5 text-theme-secondary' />
          </button>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-theme-primary'>
              체크리스트 관리
            </h1>
            <p className='text-theme-secondary'>
              체크리스트 데이터를 JSON 형식으로 업로드하고 관리합니다
            </p>
          </div>
        </div>

        {/* 업로드 섹션 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
          <h2 className='text-xl font-semibold text-theme-primary mb-4'>
            📤 체크리스트 업로드
          </h2>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 파일 업로드 */}
            <div>
              <h3 className='font-medium text-theme-primary mb-3'>
                파일 업로드
              </h3>
              <input
                type='file'
                accept='.json'
                onChange={handleFileUpload}
                className='w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-theme-primary'
              />
              <p className='text-xs text-theme-secondary mt-2'>
                JSON 파일을 선택하거나 드래그 앤 드롭하세요
              </p>
            </div>

            {/* 텍스트 입력 */}
            <div>
              <h3 className='font-medium text-theme-primary mb-3'>직접 입력</h3>
              <textarea
                value={jsonData}
                onChange={handleTextareaChange}
                onPaste={handlePaste}
                placeholder='JSON 데이터를 입력하거나 붙여넣기하세요...'
                className='w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-theme-primary resize-none'
              />
              <p className='text-xs text-theme-secondary mt-2'>
                Ctrl+V로 붙여넣기할 수 있습니다
              </p>
            </div>
          </div>

          {/* 템플릿 버튼 */}
          <div className='mt-4 flex flex-col gap-3'>
            <button
              onClick={() => getChecklistTemplate("pre-reading")}
              className='flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors'
            >
              <Plus className='h-4 w-4' />
              사전 독서 템플릿
            </button>
            <button
              onClick={() => getChecklistTemplate("long-term")}
              className='flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors'
            >
              <Plus className='h-4 w-4' />
              장기 체크리스트 템플릿
            </button>
          </div>

          {/* 업로드 버튼 */}
          <div className='mt-4'>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!jsonData.trim()}
              className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Upload className='h-4 w-4' />
              업로드
            </button>
          </div>

          {/* 메시지 */}
          {uploadMessage && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                uploadMessage.includes("성공") || uploadMessage.includes("삭제")
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              }`}
            >
              {uploadMessage}
            </div>
          )}
        </div>

        {/* 체크리스트 목록 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
          <h2 className='text-xl font-semibold text-theme-primary mb-4'>
            📋 등록된 체크리스트
          </h2>

          {isLoading ? (
            <div className='text-center py-8 text-theme-secondary'>
              로딩 중...
            </div>
          ) : checklists.length === 0 ? (
            <div className='text-center py-8 text-theme-secondary'>
              등록된 체크리스트가 없습니다.
            </div>
          ) : (
            <div className='space-y-4'>
              {checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  className='border border-gray-200 dark:border-gray-700 rounded-lg p-4'
                >
                  <div className='flex items-center justify-between mb-3'>
                    <div>
                      <h3 className='font-semibold text-theme-primary'>
                        {checklist.type === "pre-reading"
                          ? "사전 독서 체크리스트"
                          : "장기 체크리스트"}
                      </h3>
                      <p className='text-sm text-theme-secondary'>
                        버전: {checklist.version} | 항목:{" "}
                        {checklist.items.length}개
                      </p>
                    </div>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => downloadChecklist(checklist)}
                        className='p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
                        title='다운로드'
                      >
                        <Download className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedChecklist(checklist)
                          setIsEditModalOpen(true)
                        }}
                        className='p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors'
                        title='편집'
                      >
                        <Edit className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => handleDeleteChecklist(checklist.id)}
                        className='p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                        title='삭제'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    {checklist.items.slice(0, 4).map((item) => (
                      <div key={item.id} className='text-sm'>
                        <span className='font-medium text-theme-primary'>
                          {item.title}
                        </span>
                      </div>
                    ))}
                    {checklist.items.length > 4 && (
                      <div className='text-sm text-theme-secondary'>
                        +{checklist.items.length - 4}개 더...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* JSON 미리보기 모달 */}
      <JsonPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleJsonUpload}
        jsonData={jsonData}
        isUploading={isUploading}
        title='체크리스트 업로드'
        description='JSON 데이터를 확인하고 업로드하세요'
      />

      {/* 편집 모달 */}
      {isEditModalOpen && selectedChecklist && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden'>
            <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
                체크리스트 편집
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
              >
                ✕
              </button>
            </div>

            <div className='p-6 overflow-y-auto max-h-[60vh]'>
              <textarea
                value={JSON.stringify(selectedChecklist, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setSelectedChecklist(parsed)
                  } catch (error) {
                    // JSON 파싱 에러 무시
                  }
                }}
                className='w-full h-96 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none'
              />
            </div>

            <div className='p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'>
              <div className='flex justify-end gap-3'>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className='px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    try {
                      await ChecklistService.createOrUpdateSystemChecklist(
                        selectedChecklist
                      )
                      setUploadMessage("체크리스트가 업데이트되었습니다!")
                      setIsEditModalOpen(false)
                      await loadChecklists()
                    } catch (error) {
                      setUploadMessage(
                        "체크리스트 업데이트 중 오류가 발생했습니다."
                      )
                    }
                  }}
                  className='px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
