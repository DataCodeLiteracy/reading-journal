"use client"

import { useCallback, useRef, useState } from "react"
import { flushSync } from "react-dom"
import type { BookLookupMetadata } from "@/types/bookLookup"
import {
  applyBookLookupMetadata,
  type BookLookupFormSetters,
} from "@/utils/applyBookLookupMetadata"
import {
  buildExpectedFormAfterBookLookup,
  formMatchesBookLookupExpectations,
  waitUntil,
  type BookLookupFormFieldSnapshot,
} from "@/utils/bookLookupFormApplyExpectations"
import { normalizeBookLookupKdc } from "@/utils/normalizeBookLookupKdc"

type Params = {
  formState: BookLookupFormFieldSnapshot
  setters: BookLookupFormSetters
}

function waitForPaintFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count
    const step = () => {
      remaining -= 1
      if (remaining <= 0) resolve()
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

async function waitForFormSync(
  readForm: () => BookLookupFormFieldSnapshot,
  expected: Partial<BookLookupFormFieldSnapshot>,
): Promise<void> {
  await waitForPaintFrames(2)

  const matched = await waitUntil(
    () => formMatchesBookLookupExpectations(readForm(), expected),
    { intervalMs: 16, timeoutMs: 3000 },
  )

  if (!matched) {
    console.warn(
      "[useBookLookupFormApply] 폼 필드 동기화 대기 시간 초과",
      expected,
      readForm(),
    )
  }
}

export function useBookLookupFormApply({ formState, setters }: Params) {
  const [isApplying, setIsApplying] = useState(false)
  const formStateRef = useRef(formState)
  formStateRef.current = formState

  const applyBookMetadata = useCallback(
    async (metadata: BookLookupMetadata): Promise<BookLookupMetadata> => {
      const normalized = normalizeBookLookupKdc(metadata)
      setIsApplying(true)
      try {
        flushSync(() => {
          applyBookLookupMetadata(normalized, setters)
        })

        const expected = buildExpectedFormAfterBookLookup(
          normalized,
          formStateRef.current.notes,
        )

        await waitForFormSync(() => formStateRef.current, expected)

        return normalized
      } finally {
        setIsApplying(false)
      }
    },
    [setters],
  )

  return { isApplying, applyBookMetadata }
}
