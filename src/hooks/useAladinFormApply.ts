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

        const expected = buildExpectedFormAfterAladin(
          metadata,
          enriched,
          formStateRef.current.notes,
          categoryTreeRef.current,
        )

        await waitUntil(
          () =>
            formMatchesAladinExpectations(formStateRef.current, expected),
          { timeoutMs: 8000 },
        )

        return enriched
      } finally {
        setIsAladinApplying(false)
      }
    },
    [source, userId, setters],
  )

  return { isAladinApplying, applyAladinMetadata }
}
