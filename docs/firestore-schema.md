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
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

### readingSessions
- 문서 ID: `id` (자동 생성)
- 필드:
  - `id`: string
  - `user_id`: string
  - `bookId`: string
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

