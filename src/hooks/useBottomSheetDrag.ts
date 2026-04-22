"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react"

export const BOTTOM_SHEET_DRAG_CLOSE_PX = 72
const SNAP_BACK_MS = 180
export const BOTTOM_SHEET_CLOSE_ANIM_MS = 280

export type UseBottomSheetDragOptions = {
  open: boolean
  onClose: () => void
}

/**
 * 하단 시트를 아래로 드래그해 닫기. with-early-devotion과 동일한 임계값·애니메이션.
 */
export function useBottomSheetDrag({ open, onClose }: UseBottomSheetDragOptions) {
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragBaseY = useRef(0)
  const dragActiveRef = useRef(false)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const dragYRef = useRef(0)
  const [isClosingAnimating, setIsClosingAnimating] = useState(false)

  useEffect(() => {
    dragYRef.current = dragY
  }, [dragY])

  useEffect(() => {
    if (!open) {
      setEntered(false)
      setDragY(0)
      dragYRef.current = 0
      setIsDragging(false)
      setIsClosingAnimating(false)
      return
    }
    setDragY(0)
    dragYRef.current = 0
    setEntered(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  const runSnapBack = useCallback((from: number) => {
    const start = performance.now()
    const initial = from
    function tick() {
      const t = Math.min(1, (performance.now() - start) / SNAP_BACK_MS)
      const eased = 1 - (1 - t) * (1 - t)
      const val = initial * (1 - eased)
      setDragY(val)
      dragYRef.current = t < 1 ? val : 0
      if (t < 1) requestAnimationFrame(tick)
      else {
        setDragY(0)
        dragYRef.current = 0
      }
    }
    requestAnimationFrame(tick)
  }, [])

  const runCloseSlide = useCallback(() => {
    const el = sheetRef.current
    const h = el?.offsetHeight ?? 400
    const start = dragYRef.current
    const target = h + 40
    setIsClosingAnimating(true)
    const startTime = performance.now()
    function tick() {
      const t = Math.min(1, (performance.now() - startTime) / BOTTOM_SHEET_CLOSE_ANIM_MS)
      const eased = 1 - Math.pow(1 - t, 2)
      const next = start + (target - start) * eased
      setDragY(next)
      dragYRef.current = next
      if (t < 1) requestAnimationFrame(tick)
      else {
        setDragY(0)
        dragYRef.current = 0
        setIsClosingAnimating(false)
        onClose()
      }
    }
    requestAnimationFrame(tick)
  }, [onClose])

  const handlePointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragActiveRef.current = true
    setIsDragging(true)
    dragStartY.current = e.clientY
    dragBaseY.current = dragYRef.current
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    if (!dragActiveRef.current) return
    const delta = e.clientY - dragStartY.current
    const next = Math.max(0, dragBaseY.current + delta)
    setDragY(next)
    dragYRef.current = next
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!dragActiveRef.current) return
    dragActiveRef.current = false
    setIsDragging(false)
    const y = dragYRef.current
    if (y >= BOTTOM_SHEET_DRAG_CLOSE_PX) {
      runCloseSlide()
    } else {
      runSnapBack(y)
    }
  }, [runCloseSlide, runSnapBack])

  const requestClose = useCallback(() => {
    runCloseSlide()
  }, [runCloseSlide])

  const sheetHidden = !open || (!entered && dragY === 0 && !isDragging)
  const transform = sheetHidden ? "translate3d(0,100%,0)" : `translate3d(0,${dragY}px,0)`

  const transition =
    isDragging || isClosingAnimating || (!entered && dragY === 0)
      ? "none"
      : `transform ${BOTTOM_SHEET_CLOSE_ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`

  const dragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    className:
      "flex shrink-0 cursor-grab touch-none flex-col items-stretch select-none active:cursor-grabbing",
  } as const

  return {
    sheetRef,
    sheetStyle: { transform, transition } as CSSProperties,
    backdropEntered: entered,
    dragHandleProps,
    requestClose,
  }
}
