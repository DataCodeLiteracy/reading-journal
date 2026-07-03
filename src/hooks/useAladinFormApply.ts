"use client"

import { useCallback, useRef, useState } from "react"
import { flushSync } from "react-dom"
import type { AladinBookMetadata } from "@/types/aladin"
import type { AladinCategoryApplySource } from "@/types/aladinCategoryApplyLog"
import type { BookCategoryTree } from "@/types/bookCategory"
import type { AladinBookFormSetters } from "@/utils/applyAladinBookMetadata"
import { applyAladinWithCategoryLog } from "@/utils/applyAladinWithCategoryLog"
import {
  buildExpectedFormAfterAladin,
  formMatchesAladinExpectations,
  waitUntil,
  type AladinFormFieldSnapshot,
} from "@/utils/aladinFormApplyExpectations"

type Params = {
  source: AladinCategoryApplySource
  bookTitle: string
  userId: string | undefined
  categoryTree: BookCategoryTree | undefined
  categoryTreePending: boolean
  formState: AladinFormFieldSnapshot
  setters: AladinBookFormSetters
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
  readForm: () => AladinFormFieldSnapshot,
  expected: Partial<AladinFormFieldSnapshot>,
): Promise<void> {
  await waitForPaintFrames(2)

  let matched = await waitUntil(
    () => formMatchesAladinExpectations(readForm(), expected),
    { intervalMs: 16, timeoutMs: 15000 },
  )

  if (matched) return

  await waitForPaintFrames(3)
  matched = await waitUntil(
    () => formMatchesAladinExpectations(readForm(), expected),
    { intervalMs: 32, timeoutMs: 5000 },
  )

  if (!matched) {
    console.warn(
      "[useAladinFormApply] 폼 필드 동기화 대기 시간 초과",
      expected,
      readForm(),
    )
  }
}

export function useAladinFormApply({
  source,
  bookTitle,
  userId,
  categoryTree,
  categoryTreePending,
  formState,
  setters,
}: Params) {
  const [isAladinApplying, setIsAladinApplying] = useState(false)
  const formStateRef = useRef(formState)
  const categoryTreeRef = useRef(categoryTree)
  const categoryTreePendingRef = useRef(categoryTreePending)
  const bookTitleRef = useRef(bookTitle)

  formStateRef.current = formState
  categoryTreeRef.current = categoryTree
  categoryTreePendingRef.current = categoryTreePending
  bookTitleRef.current = bookTitle

  const applyAladinMetadata = useCallback(
    async (metadata: AladinBookMetadata): Promise<AladinBookMetadata> => {
      setIsAladinApplying(true)
      try {
        const needsCategoryTree = Boolean(metadata.aladinCategoryInfos?.length)
        if (needsCategoryTree) {
          await waitUntil(
            () =>
              Boolean(categoryTreeRef.current?.depth1.length) ||
              !categoryTreePendingRef.current,
            { timeoutMs: 12000 },
          )
        }

        let enriched!: AladinBookMetadata
        flushSync(() => {
          enriched = applyAladinWithCategoryLog({
            metadata,
            categoryTree: categoryTreeRef.current,
            source,
            bookTitle: bookTitleRef.current,
            userId,
            setters,
          })
        })

        const notesBeforeApply = formStateRef.current.notes
        const expected = buildExpectedFormAfterAladin(
          metadata,
          enriched,
          notesBeforeApply,
          categoryTreeRef.current,
        )

        await waitForFormSync(() => formStateRef.current, expected)

        return enriched
      } finally {
        setIsAladinApplying(false)
      }
    },
    [source, userId, setters],
  )

  return { isAladinApplying, applyAladinMetadata }
}
