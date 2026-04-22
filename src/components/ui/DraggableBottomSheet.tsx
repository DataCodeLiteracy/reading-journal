"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useBottomSheetDrag } from "@/hooks/useBottomSheetDrag"
import { BottomSheetHandle } from "@/components/ui/BottomSheetHandle"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

const RequestCloseContext = createContext<(() => void) | null>(null)

/** DraggableBottomSheet 자식에서 슬라이드 닫기(애니메이션) */
export function useDraggableSheetRequestClose() {
  return useContext(RequestCloseContext)
}

const DEFAULT_CONTENT_CLASS =
  "px-4 pb-[max(0.75rem,calc(8px+env(safe-area-inset-bottom,0px)))]"

type DraggableBottomSheetProps = {
  open: boolean
  onClose: () => void
  sheetClassName: string
  contentClassName?: string
  zIndexClass?: string
  backdropClassName?: string
  lockBody?: boolean
  children: React.ReactNode
  "aria-labelledby"?: string
}

/**
 * 백드롭 탭·상단 핸들 드래그로 닫을 수 있는 하단 시트 (with-early-devotion 패턴).
 */
export function DraggableBottomSheet({
  open,
  onClose,
  sheetClassName,
  contentClassName = DEFAULT_CONTENT_CLASS,
  zIndexClass = "z-50",
  backdropClassName = "bg-theme-backdrop",
  lockBody = true,
  children,
  "aria-labelledby": ariaLabelledBy,
}: DraggableBottomSheetProps) {
  const [mounted, setMounted] = useState(false)
  const { sheetRef, sheetStyle, backdropEntered, dragHandleProps, requestClose } =
    useBottomSheetDrag({
      open,
      onClose,
    })

  useEffect(() => setMounted(true), [])

  useBodyScrollLock(open && mounted && lockBody)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, requestClose])

  if (!mounted || !open) return null

  const node = (
    <div
      className={`fixed inset-0 ${zIndexClass} flex flex-col justify-end pointer-events-none`}
      role='presentation'
    >
      <button
        type='button'
        aria-label='닫기'
        className={`absolute inset-0 pointer-events-auto ${backdropClassName} transition-opacity duration-300 ${
          backdropEntered ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => requestClose()}
      />
      <div
        ref={sheetRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={ariaLabelledBy}
        className={`pointer-events-auto relative z-[1] mx-auto flex h-auto w-full max-w-lg max-h-[85dvh] flex-col overflow-hidden ${sheetClassName}`}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          {...dragHandleProps}
          className={`${dragHandleProps.className} shrink-0 px-4 pb-0.5 pt-3`}
        >
          <div className='flex flex-col items-center pb-3'>
            <BottomSheetHandle className='mb-0' />
          </div>
        </div>
        <div className={`min-h-0 flex-1 overflow-hidden ${contentClassName}`}>
          <RequestCloseContext.Provider value={requestClose}>
            {children}
          </RequestCloseContext.Provider>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
