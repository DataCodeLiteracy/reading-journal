/** 알라딘 Open API 검색 결과 (클라이언트·서버 공용 DTO) */
export type AladinSearchHit = {
  title: string
  author: string
  publisher?: string
  publishedDate?: string
  coverUrl?: string
  isbn13?: string
  description?: string
}

/** 알라딘 categoryIdList 항목 (클라이언트 분야 매핑용) */
export type AladinCategoryInfo = {
  categoryId: string
  categoryName: string
}

/** 상품 조회 후 폼 자동 채움용 */
export type AladinBookMetadata = AladinSearchHit & {
  categoryDepth1Id?: string
  categoryDepth1Label?: string
  categoryDepth2Id?: string
  categoryDepth2Label?: string
  /** ItemLookUp categoryIdList — UI 트리(Firestore)와 매핑할 때 사용 */
  aladinCategoryInfos?: AladinCategoryInfo[]
}
