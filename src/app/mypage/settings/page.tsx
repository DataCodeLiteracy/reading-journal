"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Moon, Sun, Type, Palette, Save, Check } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"

export default function SettingsPage() {
  const router = useRouter()
  const { loading, isLoggedIn } = useAuth()
  const { settings, updateSettings } = useSettings()
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
  }, [isLoggedIn, loading, router])

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    updateSettings({ [key]: value })
    setIsSaved(false)
  }

  const handleSave = () => {
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <div className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        <header className='mb-6'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
            뒤로가기
          </button>
          <h1 className='text-3xl font-bold text-theme-primary mb-2'>
            ⚙️ 설정
          </h1>
          <p className='text-theme-secondary text-sm'>
            앱의 외관과 동작을 커스터마이즈하세요
          </p>
        </header>

        <div className='max-w-2xl'>
          {/* 테마 설정 */}
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-2 bg-accent-theme-tertiary rounded-lg'>
                <Palette className='h-5 w-5 accent-theme-primary' />
              </div>
              <h2 className='text-lg font-semibold text-theme-primary'>
                테마 설정
              </h2>
            </div>
            <div className='space-y-3'>
              {[
                { value: "light", label: "라이트 모드", icon: Sun },
                { value: "dark", label: "다크 모드", icon: Moon },
              ].map((option) => (
                <label
                  key={option.value}
                  className='flex items-center gap-3 p-3 rounded-lg border border-theme-tertiary cursor-pointer hover:bg-theme-tertiary transition-colors'
                >
                  <input
                    type='radio'
                    name='theme'
                    value={option.value}
                    checked={settings.theme === option.value}
                    onChange={(e) =>
                      handleSettingChange("theme", e.target.value)
                    }
                    className='sr-only'
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      settings.theme === option.value
                        ? "border-accent-theme bg-accent-theme"
                        : "border-theme-tertiary"
                    }`}
                  >
                    {settings.theme === option.value && (
                      <div className='w-2 h-2 bg-white rounded-full m-0.5' />
                    )}
                  </div>
                  <option.icon className='h-5 w-5 text-theme-secondary' />
                  <span className='text-theme-primary'>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 폰트 크기 설정 */}
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg'>
                <Type className='h-5 w-5 text-purple-600 dark:text-purple-400' />
              </div>
              <h2 className='text-lg font-semibold text-theme-primary'>
                폰트 크기
              </h2>
            </div>
            <div className='space-y-3'>
              {[
                { value: "small", label: "작게", size: "text-sm" },
                { value: "medium", label: "보통", size: "text-base" },
                { value: "large", label: "크게", size: "text-lg" },
              ].map((option) => (
                <label
                  key={option.value}
                  className='flex items-center gap-3 p-3 rounded-lg border border-theme-tertiary cursor-pointer hover:bg-theme-tertiary transition-colors'
                >
                  <input
                    type='radio'
                    name='fontSize'
                    value={option.value}
                    checked={settings.fontSize === option.value}
                    onChange={(e) =>
                      handleSettingChange("fontSize", e.target.value)
                    }
                    className='sr-only'
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      settings.fontSize === option.value
                        ? "border-accent-theme bg-accent-theme"
                        : "border-theme-tertiary"
                    }`}
                  >
                    {settings.fontSize === option.value && (
                      <div className='w-2 h-2 bg-white rounded-full m-0.5' />
                    )}
                  </div>
                  <span className={`text-theme-primary ${option.size}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 색상 테마 설정 */}
          <div className='bg-theme-secondary rounded-lg p-6 shadow-sm mb-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg'>
                <Palette className='h-5 w-5 text-orange-600 dark:text-orange-400' />
              </div>
              <h2 className='text-lg font-semibold text-theme-primary'>
                색상 테마
              </h2>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              {[
                { value: "blue", label: "파란색", color: "bg-blue-500" },
                { value: "green", label: "초록색", color: "bg-green-500" },
                { value: "purple", label: "보라색", color: "bg-purple-500" },
                { value: "orange", label: "주황색", color: "bg-orange-500" },
              ].map((option) => (
                <label
                  key={option.value}
                  className='flex items-center gap-3 p-3 rounded-lg border border-theme-tertiary cursor-pointer hover:bg-theme-tertiary transition-colors'
                >
                  <input
                    type='radio'
                    name='colorScheme'
                    value={option.value}
                    checked={settings.colorScheme === option.value}
                    onChange={(e) =>
                      handleSettingChange("colorScheme", e.target.value)
                    }
                    className='sr-only'
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      settings.colorScheme === option.value
                        ? "border-accent-theme bg-accent-theme"
                        : "border-theme-tertiary"
                    }`}
                  >
                    {settings.colorScheme === option.value && (
                      <div className='w-2 h-2 bg-white rounded-full m-0.5' />
                    )}
                  </div>
                  <div className={`w-4 h-4 rounded-full ${option.color}`} />
                  <span className='text-theme-primary'>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className='flex justify-end'>
            <button
              onClick={handleSave}
              className='flex items-center gap-2 bg-accent-theme hover:bg-accent-theme-secondary text-white px-6 py-3 rounded-lg transition-colors'
            >
              {isSaved ? (
                <>
                  <Check className='h-5 w-5' />
                  저장됨
                </>
              ) : (
                <>
                  <Save className='h-5 w-5' />
                  설정 저장
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
