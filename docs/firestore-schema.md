# Firestore 컬렉션 구조 설계

## 기존 컬렉션

### users
- 문서 ID: `uid`
- 필드:
  - `uid`: string
  - `email`: string | null
  - `displayName`: string | null
  - `photoURL`: string | null
  - `emailVerified`: boolean
  - `phoneNumber`: string | null
  - `lastLoginAt`: Timestamp
  - `isActive`: boolean
  - `isAdmin`: boolean (optional)
  - `child_invite_code`: string (optional) - 나를 자녀로 연결할 때 쓰는 초대 코드
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

### guardianChildLinks
- 문서 ID: `{guardian_user_id}__{child_user_id}`
- 앱 전역 보호자↔자녀 연결 (모임과 무관)
- 필드:
  - `guardian_user_id`: string
  - `child_user_id`: string
  - `child_display_name`: string
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

### books
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `user_id`: string
  - `title`: string
  - `author`: string (optional)
  - `publishedDate`: string (optional)
  - `startDate`: string (optional)
  - `status`: "reading" | "completed" | "want-to-read" | "on-hold"
  - `rating`: number
  - `review`: string (optional)
  - `reviewIsPublic`: boolean (optional)
  - `hasStartedReading`: boolean
  - `completedDate`: string (optional)
  - `level`: string (optional) - 대상 연령/학년: 유아, 초1~초6, 중1~중3, 고1~고3, 성인
  - `category`: string (optional) - 분야: 그림책, 동화책, 청소년책, 성인책
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

### readingSessions
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `user_id`: string
  - `bookId`: string
  - `source`: "timer" | "manual" (optional)
  - `reading_mode`: "self" | "read_aloud" (optional, 기본 self)
  - `read_aloud_segments`: array (optional) - `{ child_user_ids, startTime, endTime }` 구간 스냅샷
  - `read_aloud_parent_session_id`: string (optional) - 자녀 복제 세션이 가리키는 보호자 원본
  - `startTime`: string (ISO format)
  - `endTime`: string (ISO format)
  - `duration`: number (초 단위)
  - `date`: string (YYYY-MM-DD)
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

### userStatistics
- 문서 ID: `user_id`
- 필드:
  - `user_id`: string
  - `totalReadingTime`: number (초 단위)
  - `totalSessions`: number
  - `averageSessionTime`: number
  - `longestSessionTime`: number
  - `averageDailyTime`: number
  - `daysWithSessions`: number
  - `longestStreak`: number
  - `monthlyReadingTime`: number
  - `mostReadGenre`: string (optional)
  - `readingStreak`: number
  - `level`: number (optional) - 현재 레벨
  - `experience`: number (optional) - 총 경험치
  - `totalLikesReceived`: number (optional) - 내 콘텐츠가 받은 총 좋아요 수 (보너스 경험치 계산용)
  - `totalCommentsWritten`: number (optional) - 내가 작성한 총 댓글 수 (보너스 경험치 계산용)
  - `updated_at`: Timestamp

### bookQuestions
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `bookId`: string
  - `questionText`: string
  - `chapterPath`: string[] (최대 5단계)
  - `questionType`: "comprehension" | "analysis" | "synthesis" | "application"
  - `difficulty`: "easy" | "medium" | "hard"
  - `order`: number
  - `isPublic`: boolean (optional, 기본값: false)
  - `likesCount`: number (optional, 기본값: 0)
  - `commentsCount`: number (optional, 기본값: 0)
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

### questionAnswers
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `questionId`: string
  - `bookId`: string
  - `user_id`: string
  - `answerText`: string (optional)
  - `audioUrl`: string (optional)
  - `audioTranscript`: string (optional)
  - `isPublic`: boolean (optional, 기본값: false)
  - `likesCount`: number (optional, 기본값: 0)
  - `commentsCount`: number (optional, 기본값: 0)
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

### goldenBellQuizzes (독서 골든벨 퀴즈)
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `bookTitle`: string - 책 제목 (같은 제목의 책들이 퀴즈 공유)
  - `version`: string - 버전 (예: "1.0")
  - `difficulty`: "easy" | "hard" - 난이도 (쉬움/어려움)
  - `questions`: array - 문제 배열
    - `id`: number
    - `type`: "객관식" | "단답형" | "서술형"
    - `question`: string
    - `options`: string[] (객관식일 경우 선택지)
  - `answers`: array - 답안 배열
    - `id`: number
    - `answer`: string
    - `explanation`: string
  - `createdBy`: string - 등록한 사용자 ID
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

**인덱스:** `bookTitle` (ascending) + `created_at` (descending)

### goldenBellResults (독서 골든벨 결과)
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `quizId`: string - 퀴즈 ID
  - `bookTitle`: string - 책 제목
  - `difficulty`: "easy" | "hard" - 난이도
  - `userId`: string - 사용자 ID
  - `totalQuestions`: number - 총 문제 수
  - `correctCount`: number - 정답 수
  - `score`: number - 점수 (0-100)
  - `answers`: array - 사용자 응답 배열
    - `questionId`: number
    - `userAnswer`: string
    - `isCorrect`: boolean
  - `completedAt`: Timestamp - 풀이 완료 시간
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

**인덱스:** `userId` (ascending) + `completedAt` (descending)

### goldenBellRequests (독서 골든벨 출제 요청)
- 문서 ID: `id` (자동 생성)
- 필드:
  - `user_id`: string - 요청한 유저 ID
  - `user_display_name`: string (optional) - 요청한 유저 표시 이름
  - `book_id`: string - 대상 책 ID
  - `book_title`: string - 대상 책 제목
  - `status`: "pending" | "done" (optional, 기본값: "pending") - 관리자 처리 상태
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

**인덱스:** `created_at` (descending) - 관리자 목록 최신순 조회

---

## 새로운 컬렉션

### quotes (구절 기록)
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `bookId`: string
  - `user_id`: string
  - `quoteText`: string - 타이핑한 구절 텍스트
  - `thoughts`: string (optional) - 해당 구절에 대한 느낌/생각
  - `generalThoughts`: string (optional) - 구절과 무관하게 책을 읽다가 느낀 점
  - `isPublic`: boolean - 공개 여부 (기본값: false)
  - `likesCount`: number - 좋아요 수 (캐시된 값, 기본값: 0)
  - `commentsCount`: number - 댓글 수 (캐시된 값, 기본값: 0)
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

**인덱스:**
- `bookId` (ascending) + `created_at` (descending)
- `user_id` (ascending) + `created_at` (descending)
- `isPublic` (ascending) + `created_at` (descending) - 공개 콘텐츠 조회용

### critiques (서평)
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `bookId`: string
  - `user_id`: string
  - `title`: string (optional) - 서평 제목
  - `content`: string - 서평 내용
  - `isPublic`: boolean - 공개 여부 (기본값: false)
  - `likesCount`: number - 좋아요 수 (캐시된 값, 기본값: 0)
  - `commentsCount`: number - 댓글 수 (캐시된 값, 기본값: 0)
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

**인덱스:**
- `bookId` (ascending) + `created_at` (descending)
- `user_id` (ascending) + `created_at` (descending)
- `isPublic` (ascending) + `created_at` (descending) - 공개 콘텐츠 조회용

### likes (좋아요)
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `user_id`: string - 좋아요를 누른 사용자
  - `contentType`: "quote" | "critique" | "review" | "question" | "answer"
  - `contentId`: string - 좋아요 대상 콘텐츠 ID
  - `created_at`: Timestamp

**인덱스:**
- `contentType` (ascending) + `contentId` (ascending) + `user_id` (ascending) - 중복 좋아요 방지
- `user_id` (ascending) + `created_at` (descending) - 사용자별 좋아요 목록
- `contentType` (ascending) + `contentId` (ascending) - 콘텐츠별 좋아요 수 조회

### comments (댓글)
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `user_id`: string - 댓글 작성자
  - `contentType`: "quote" | "critique" | "review" | "question" | "answer"
  - `contentId`: string - 댓글 대상 콘텐츠 ID
  - `content`: string - 댓글 내용
  - `isPublic`: boolean - 댓글 공개 여부 (기본값: true)
  - `likesCount`: number - 댓글에 대한 좋아요 수 (기본값: 0)
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

**인덱스:**
- `contentType` (ascending) + `contentId` (ascending) + `created_at` (ascending) - 콘텐츠별 댓글 목록
- `user_id` (ascending) + `created_at` (descending) - 사용자별 댓글 목록

---

## Firestore 보안 규칙 고려사항

### 읽기 권한
- `quotes`, `critiques`: `isPublic === true`인 경우 모든 사용자 읽기 가능
- `likes`, `comments`: 공개된 콘텐츠에 대한 것만 읽기 가능

### 쓰기 권한
- `quotes`, `critiques`: 본인만 생성/수정/삭제 가능
- `likes`: 본인만 생성/삭제 가능 (중복 방지)
- `comments`: 본인만 생성/수정/삭제 가능

### 업데이트 권한
- `likesCount`, `commentsCount`: 서버에서만 업데이트 가능 (트랜잭션으로 관리)

---

## 데이터 일관성 관리

### 좋아요/댓글 수 캐싱
- `likesCount`, `commentsCount`는 실제 서브컬렉션을 조회하지 않고 캐시된 값을 사용
- 좋아요/댓글 추가/삭제 시 Firestore 트랜잭션으로 카운트 업데이트
- 주기적으로 실제 수와 캐시된 값을 동기화하는 배치 작업 실행

### 인덱스 생성
Firestore Console에서 다음 복합 인덱스를 생성해야 합니다:

1. `quotes` 컬렉션:
   - `bookId` (Ascending) + `created_at` (Descending)
   - `user_id` (Ascending) + `created_at` (Descending)
   - `isPublic` (Ascending) + `created_at` (Descending)

2. `critiques` 컬렉션:
   - `bookId` (Ascending) + `created_at` (Descending)
   - `user_id` (Ascending) + `created_at` (Descending)
   - `isPublic` (Ascending) + `created_at` (Descending)

3. `likes` 컬렉션:
   - `contentType` (Ascending) + `contentId` (Ascending) + `user_id` (Ascending)
   - `user_id` (Ascending) + `created_at` (Descending)
   - `contentType` (Ascending) + `contentId` (Ascending)

4. `comments` 컬렉션:
   - `contentType` (Ascending) + `contentId` (Ascending) + `created_at` (Ascending)
   - `user_id` (Ascending) + `created_at` (Descending)

---

## 독서모임 컬렉션과 권한

독서모임 데이터는 모두 루트 컬렉션으로 저장하며, 관련 문서는 `group_id`로 연결합니다.

- `readingGroups`: 모임 기본 정보, owner, 초대코드
- `readingGroupMembers`: 멤버와 owner membership (`{group_id}__{user_id}` ID 사용). `role`은 권한(`owner`/`member`), `member_roles`는 참여 역할 배열(`participant` / `guardian`, 복수 가능). `member_kind`·`reads_for_user_id`는 마이그레이션 호환용(deprecated). 역할이 없으면 참여자로 취급합니다.
- `readingGroupBooks`: 모임 선정 도서
- `readingGroupMeetings`: 모임 회차
- `readingGroupMeetingBookAssignments`: 회차별 읽기 과제
- `readingGroupMeetingBookRecommendations`: 회차별 «함께 보면 좋은 책»(멤버 추천)
- `readingGroupMeetingRecords`: 회차 기록
- `readingGroupPosts`: 운영 문서와 회원 게시물
- `readingGroupPostComments`: 회원 게시물 댓글
- `readingGroupRecordShares`: 모임에 공유한 개인 기록
- `readingGroupReadingAttributions`: 개인 독서 세션을 모임 과제에 귀속한 기록. `reading_mode`(`self`/`read_aloud`)로 원본 세션 모드를 남겨 보호자 「읽어준 시간」과 참여자 누적을 구분합니다.

### 권한 요약

- 모든 독서모임 작업에는 Firebase Authentication이 필요합니다.
- `readingGroups.owner_user_id`인 owner만 모임 구조, 멤버, 도서, 회차, 과제, 회차 기록과 운영 문서(`announcement`, `group_rule`, `reading_method`, `discussion_rule`)를 생성·수정·삭제할 수 있습니다.
- `status == "active"`인 membership을 가진 사용자는 해당 모임 데이터를 읽을 수 있습니다.
- active member는 `member_post`와 댓글을 만들 수 있습니다. 작성자만 자기 글·댓글을 수정할 수 있으며, owner는 moderation 목적으로 삭제만 할 수 있고 다른 회원 글을 수정할 수 없습니다.
- active member는 완료되지 않은 회차에 «함께 보면 좋은 책»을 추천할 수 있습니다. 추천자 본인은 추천 이유(`note`)를 수정·삭제할 수 있습니다. owner는 다른 멤버 추천을 포함해 모임 책장 공식 책으로 올릴 수 있으며(같은 회차 동일 판본 추천 정리), 추천 단독 삭제는 본인 것만 가능합니다.
- 기록 공유는 active member가 본인 명의로 만들고 수정·삭제합니다. owner는 moderation 삭제가 가능합니다.
- 독서 귀속은 본인의 `readingSessions` 문서에 대해서만 만들 수 있습니다. membership이 active여야 하며, 과제·회차·그룹 도서의 `group_id`와 귀속 문서의 `group_id`가 모두 일치해야 합니다. 수정 시 `group_id`, `reading_session_id`, `user_id`, 표시 이름, canonical book ID는 바꿀 수 없습니다. 일반 삭제는 해당 사용자만 가능하고, owner가 모임 문서도 같은 atomic batch에서 삭제하는 cascade에 한해 owner 삭제를 허용합니다.
- owner membership은 모임 문서와 같은 batch에서 생성할 수 있도록 Rules의 `getAfter()`로 새 모임의 owner를 확인합니다.

### 초대코드 가입

클라이언트는 `/api/groups/join`에 Firebase ID token, 초대코드, 표시 이름, 참여 유형(`participant`/`guardian`)을 보냅니다. 서버가 ID token과 active 그룹의 초대코드를 검증한 후 Admin SDK transaction으로 membership을 생성합니다. 가입 전 그룹 문서 읽기와 클라이언트의 membership self-create는 Security Rules에서 허용하지 않습니다.

### 모임장 이양

현재 모임장은 `/api/groups/transfer-ownership`으로 다른 활성 계정 멤버에게 모임장 역할을 넘길 수 있습니다. Admin SDK transaction이 `readingGroups.owner_user_id`와 양쪽 membership `role`을 원자적으로 바꿉니다.

### 모임 책 상태와 회차 읽기 기간

- `readingGroupBooks`는 날짜 없는 모임 책장 항목입니다. 새 문서는 항상 `planned`로 생성하며 기존 `start_date`/`end_date`는 호환 목적으로 읽기만 합니다.
- `status`는 `planned`(예정), `on_hold`(선정 보류), `reading`(읽는 중), `reading_paused`(정지), `completed`(완료), `paused`(중단)입니다. 기존 `paused`의 의미는 중단으로 유지합니다.
- 미배정 책은 `planned`와 `on_hold` 사이에서만 바꿉니다. 배정 후 시작 시각부터 유효 상태가 `reading`이며, 진행 중에는 `reading_paused` 또는 `paused`로 바꿀 수 있습니다. `completed`는 회차 완료 batch에서만 확정합니다.
- 회차당 `readingGroupMeetingBookAssignments` 문서를 한 개 이상 사용합니다(저학년 등에서는 한 회차에 여러 권을 배정할 수 있습니다). 같은 회차의 모든 assignment는 동일한 `reading_start_at`/`reading_end_at`을 공유하며, 독서 시작일은 모임장이 선택하고 첫 회차는 그룹 생성일 다음 날, 후속 회차는 직전 회차 날짜 다음 날을 기본값으로 제안합니다. `reading_end_at`은 종료 날짜의 실제 모임 시간과 같고, 그 시각이 지나면 회차는 `완료 대기`로 표시됩니다. 귀속 범위는 ISO `[reading_start_at, reading_end_at)`입니다. 배정한 책은 회차 수정 화면에서 변경할 수 없고 읽기 기간만 조정됩니다.
- `paused` 전환은 `stopped_at`에 중단 시점을 기록하되 원래 예정 마감 스냅샷인 `reading_end_at`은 변경하지 않습니다. 새로 생성·수정·재동기화하는 귀속은 `[reading_start_at, min(reading_end_at, stopped_at))`만 계산합니다.
- 중단을 실행한 사용자가 해당 판본을 개인 서재에 보유한 경우 본인 소유 세션은 즉시 재동기화합니다. 다른 멤버의 기존 귀속은 권한을 우회해 일괄 수정하지 않으며, 이후 해당 멤버 세션이 수정·재동기화될 때 중단 경계가 반영됩니다.
- 완료 batch는 회차를 `completed`로 바꾸고 회차에 속한 모든 assignment에 `completed_at`, `book_title_snapshot`, 선택적 `book_author_snapshot`/`book_cover_url_snapshot`을 저장합니다. 정상 진행 책은 `completed`가 되며, 이미 `paused`로 중단된 책은 중단 상태를 보존합니다. 완료된 회차의 assignment는 이후 수정·삭제하지 않습니다.
- 기존 assignment에 스냅샷이 없으면 화면과 공개 API는 현재 `readingGroupBooks`의 제목·저자·표지를 fallback으로 사용합니다.
- `readingGroupMeetingBookRecommendations`는 회차 공식 배정과 별개입니다. 멤버가 같은 회차에 참고로 읽으면 좋은 책을 추천하며, 동일 판본을 여러 명이 각각 추천할 수 있습니다. 공식 배정 판본과 같은 책은 추천할 수 없습니다. owner는 추천을 모임 책장 공식 책으로 올릴 수 있으며, 이때 같은 회차의 동일 판본 추천은 함께 정리됩니다. 보호자(`member_kind: guardian`) 관련 진행 UI는 모임에 보호자가 있을 때만 표시합니다.

