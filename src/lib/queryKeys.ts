/**
 * TanStack Query 쿼리 키 — 문자열 리터럴과 uid 조합으로 무효화·프리패치 시 일관되게 사용합니다.
 */
export const queryKeys = {
  explore: {
    all: ["explore"] as const,
    groups: (sortBy: string) => ["explore", "groups", sortBy] as const,
    booksFlatCount: (filtersKey: string) =>
      ["explore", "booksFlatCount", filtersKey] as const,
    booksFlatPage: (filtersKey: string, page: number) =>
      ["explore", "booksFlatPage", filtersKey, page] as const,
    highlights: (groupKeys: string) =>
      ["explore", "highlights", groupKeys] as const,
    registrants: (bookIdsKey: string) =>
      ["explore", "registrants", bookIdsKey] as const,
    full: (filtersKey: string) => ["explore", "full", filtersKey] as const,
    filterMeta: ["explore", "filter-meta"] as const,
  },
  user: {
    /** 로그인 유저 책·세션·통계·시간대 패턴 (DataContext) */
    dashboard: (uid: string | null | undefined) =>
      ["userDashboard", uid] as const,
    /** 공개 프로필·댓글 등 단건 유저 조회 캐시 */
    byId: (uid: string) => ["user", "byId", uid] as const,
    books: (uid: string | null | undefined) => ["userBooks", uid] as const,
    readingSessions: (uid: string | null | undefined) =>
      ["readingSessions", uid] as const,
    statistics: (uid: string | null | undefined) =>
      ["userStatistics", uid] as const,
    /** 서재 목록 쿼리 묶음 무효화용 */
    libraryRoot: (uid: string) => ["userLibrary", uid] as const,
    libraryPage: (
      uid: string,
      status: string,
      sort: string,
      level: string,
      categoryDepth2Id: string,
      toReadThisYear: string,
      titlePrefix: string,
      page: number,
    ) =>
      [
        "userLibrary",
        uid,
        "page",
        status,
        sort,
        level,
        categoryDepth2Id,
        toReadThisYear,
        titlePrefix,
        page,
      ] as const,
    libraryTabCount: (
      uid: string,
      status: string,
      level: string,
      categoryDepth2Id: string,
      toReadThisYear: string,
      titlePrefix: string,
    ) =>
      [
        "userLibrary",
        uid,
        "tabCount",
        status,
        level,
        categoryDepth2Id,
        toReadThisYear,
        titlePrefix,
      ] as const,
    libraryCounts: (uid: string) => ["userLibraryCounts", uid] as const,
  },
  book: {
    detail: (bookId: string) => ["book", bookId] as const,
    readingSessionsForBook: (bookId: string) =>
      ["bookReadingSessions", bookId] as const,
    /** 상세 초기 로드(책·세션·회독 등 한 번에) */
    bundle: (bookId: string, ownerUserId: string) =>
      ["bookBundle", bookId, ownerUserId] as const,
  },
  comments: {
    list: (contentType: string, contentId: string) =>
      ["comments", contentType, contentId] as const,
  },
  publicUser: {
    profile: (uid: string) => ["publicUser", uid] as const,
    books: (uid: string) => ["publicUserBooks", uid] as const,
  },
  home: {
    tabBooks: (
      uid: string | null | undefined,
      tab: string,
      page: number,
      sortKey: string,
    ) => ["homeTabBooks", uid, tab, page, sortKey] as const,
  },
  bookCategories: {
    tree: () => ["bookCategoryTree"] as const,
  },
  record: {
    availableBooks: (uid: string, onlyMine: boolean) =>
      ["record", "availableBooks", uid, onlyMine] as const,
    contentInfinite: (
      uid: string,
      contentType: string,
      bookId: string,
      search: string,
      onlyMine: boolean,
    ) =>
      ["record", "infinite", uid, contentType, bookId, search, onlyMine] as const,
    contentCount: (uid: string, contentType: string, scopeKey: string) =>
      ["record", "contentCount", uid, contentType, scopeKey] as const,
    contentPage: (
      uid: string,
      contentType: string,
      scopeKey: string,
      page: number,
    ) => ["record", "contentPage", uid, contentType, scopeKey, page] as const,
  },
  readingGroups: {
    all: ["readingGroups"] as const,
    browse: {
      all: ["readingGroups", "browse"] as const,
      list: (uid: string | null | undefined) =>
        ["readingGroups", "browse", "list", uid] as const,
      detail: (groupId: string, uid: string | null | undefined) =>
        ["readingGroups", "browse", "detail", groupId, uid] as const,
    },
    mine: (uid: string | null | undefined) =>
      ["readingGroups", "mine", uid] as const,
    detail: (groupId: string) =>
      ["readingGroups", "detail", groupId] as const,
    members: (groupId: string) =>
      ["readingGroups", groupId, "members"] as const,
    books: (groupId: string) =>
      ["readingGroups", groupId, "books"] as const,
    meetings: (groupId: string) =>
      ["readingGroups", groupId, "meetings"] as const,
    assignments: (meetingId: string) =>
      ["readingGroups", "meetings", meetingId, "assignments"] as const,
    meetingRecord: (meetingId: string) =>
      ["readingGroups", "meetings", meetingId, "record"] as const,
    meetingRecords: (groupId: string) =>
      ["readingGroups", groupId, "meetingRecords"] as const,
    posts: (groupId: string) =>
      ["readingGroups", groupId, "posts"] as const,
    comments: (postId: string) =>
      ["readingGroups", "posts", postId, "comments"] as const,
    recordShares: (groupId: string) =>
      ["readingGroups", groupId, "recordShares"] as const,
    recordShareCandidates: (groupId: string, uid: string) =>
      ["readingGroups", groupId, "recordShareCandidates", uid] as const,
    attributions: (groupId: string) =>
      ["readingGroups", groupId, "attributions"] as const,
    readingNotes: (groupId: string) =>
      ["readingGroups", groupId, "readingNotes"] as const,
    readingNotesPreview: (groupId: string, filterKey: string) =>
      ["readingGroups", groupId, "readingNotes", "preview", filterKey] as const,
    readingNotesPage: (
      groupId: string,
      type: string,
      filterKey: string,
      sort: string,
      page: number,
    ) =>
      [
        "readingGroups",
        groupId,
        "readingNotes",
        type,
        filterKey,
        sort,
        page,
      ] as const,
    sessionAttributions: (readingSessionId: string) =>
      ["readingGroups", "sessions", readingSessionId, "attributions"] as const,
  },
} as const
