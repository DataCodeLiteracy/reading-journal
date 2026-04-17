import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { QueryProvider } from "@/providers/QueryProvider"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { DataProvider } from "@/contexts/DataContext"
import { ReadingTimerSheetProvider } from "@/contexts/ReadingTimerSheetContext"
import BottomNavigation from "@/components/BottomNavigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "독서 기록장",
  description: "나만의 독서 여정을 기록하고 관리해보세요",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang='ko'
      data-theme='light'
      data-color-scheme='blue'
      data-font-size='medium'
    >
      <body className={inter.className}>
        <AuthProvider>
          <QueryProvider>
            <SettingsProvider>
              <DataProvider>
                <ReadingTimerSheetProvider>
                  {children}
                  <BottomNavigation />
                </ReadingTimerSheetProvider>
              </DataProvider>
            </SettingsProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
