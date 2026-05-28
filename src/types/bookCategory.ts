/** 대분류 (알라딘 1depth) */
export interface BookCategoryDepth1 {
  id: string
  label: string
  order: number
  isActive: boolean
  created_at?: Date
  updated_at?: Date
}

/** 중분류 (알라딘 2depth, 대분류 하위) */
export interface BookCategoryDepth2 {
  id: string
  parentId: string
  label: string
  order: number
  isActive: boolean
  /** 알라딘 중분류 CID (참고용, 선택) */
  aladinCid?: string
  /** 해당 대분류의 «기타» 중분류 */
  isOther?: boolean
  created_at?: Date
  updated_at?: Date
}

export type BookCategoryTree = {
  depth1: BookCategoryDepth1[]
  depth2: BookCategoryDepth2[]
}
