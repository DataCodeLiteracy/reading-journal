"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type Ctx = {
  sheetOpen: boolean
  setSheetOpen: (open: boolean) => void
  immersiveOpen: boolean
  setImmersiveOpen: (open: boolean) => void
}

const ReadingTimerSheetContext = createContext<Ctx | null>(null)

export function ReadingTimerSheetProvider({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpenState] = useState(false)
  const [immersiveOpen, setImmersiveOpenState] = useState(false)
  const setSheetOpen = useCallback((open: boolean) => {
    setSheetOpenState(open)
  }, [])
  const setImmersiveOpen = useCallback((open: boolean) => {
    setImmersiveOpenState(open)
  }, [])
  const value = useMemo(
    () => ({ sheetOpen, setSheetOpen, immersiveOpen, setImmersiveOpen }),
    [sheetOpen, setSheetOpen, immersiveOpen, setImmersiveOpen]
  )
  return (
    <ReadingTimerSheetContext.Provider value={value}>
      {children}
    </ReadingTimerSheetContext.Provider>
  )
}

export function useReadingTimerSheet(): Ctx {
  const c = useContext(ReadingTimerSheetContext)
  if (!c) {
    return {
      sheetOpen: false,
      setSheetOpen: () => {},
      immersiveOpen: false,
      setImmersiveOpen: () => {},
    }
  }
  return c
}
