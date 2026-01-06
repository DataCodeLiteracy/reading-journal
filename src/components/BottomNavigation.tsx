"use client"

import { usePathname, useRouter } from "next/navigation"
import { Home, PenSquare, User, BookOpen } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

const navigationItems = [
  {
    label: "홈",
    icon: Home,
    path: "/",
  },
  {
    label: "독서",
    icon: BookOpen,
    path: "/books",
  },
  {
    label: "기록",
    icon: PenSquare,
    path: "/record",
  },
  {
    label: "마이페이지",
    icon: User,
    path: "/mypage",
  },
]

export default function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn } = useAuth()

  // 로그인하지 않았거나 로그인 페이지에서는 네비게이션 바 숨김
  if (!isLoggedIn || pathname === "/login") {
    return null
  }

  // 관리자 페이지나 책 상세 페이지 등에서는 네비게이션 바 숨김 (선택적)
  // 필요에 따라 특정 경로에서 숨길 수 있음
  const hidePaths = ["/admin"]
  if (hidePaths.some((path) => pathname.startsWith(path))) {
    return null
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <nav className='fixed bottom-0 left-0 right-0 bg-theme-secondary border-t border-theme-tertiary z-50 safe-area-inset-bottom'>
      <div className='container mx-auto'>
        <div className='flex items-center justify-around py-2'>
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.path || pathname.startsWith(item.path + "/")

            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                  isActive
                    ? "text-accent-theme"
                    : "text-theme-secondary hover:text-theme-primary"
                }`}
                aria-label={item.label}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-2" : ""}`} />
                <span className='text-xs font-medium truncate w-full text-center'>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
