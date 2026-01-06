# Firestore 인덱스 설정 가이드

이 문서는 독서 기록장 애플리케이션에서 필요한 Firestore 인덱스 설정을 안내합니다.

## 필수 인덱스

Firestore에서는 필터와 정렬을 함께 사용하는 복합 쿼리에 대해 인덱스가 필요합니다.

### 리더보드 관련 인덱스

**네, 각 필드별로 별도의 인덱스를 생성해야 합니다.**

Firestore에서는 단일 필드로 정렬하는 경우에도 각 필드별로 별도의 인덱스가 필요합니다. 현재 사용 중인 쿼리:

- ✅ **`level` 필드** (내림차순) - **필수** - 메인 페이지와 전체 순위 페이지에서 사용
- ⚠️ **`experience` 필드** (내림차순) - 선택사항 - `getTopUsersByExperience` 메서드에서 사용 (현재는 호출되지 않음)
- ⚠️ **`totalReadingTime` 필드** (내림차순) - 선택사항 - `getTopUsersByReadingTime` 메서드에서 사용 (현재는 호출되지 않음)

### 1. users 컬렉션 - level 필드 (필수) ⭐

**컬렉션**: `users`  
**필드**: `level` (내림차순)  
**용도**: 레벨 기준으로 사용자를 정렬하여 리더보드 조회 (메인 페이지, 전체 순위 페이지)

**Firebase Console에서 설정:**
1. Firebase Console → Firestore Database → Indexes
2. "Create Index" 클릭
3. Collection ID: `users`
4. Fields to index:
   - Field: `level`, Order: `Descending`
5. "Create" 클릭

**이 인덱스는 반드시 필요합니다!** 메인 페이지와 전체 순위 페이지에서 사용됩니다.

### 2. users 컬렉션 - experience 필드 (선택사항)

**컬렉션**: `users`  
**필드**: `experience` (내림차순)  
**용도**: 경험치 기준으로 사용자를 정렬

**참고**: 현재는 사용하지 않지만, 향후 경험치 기준 정렬 기능을 사용하려면 필요합니다.

### 3. users 컬렉션 - totalReadingTime 필드 (선택사항)

**컬렉션**: `users`  
**필드**: `totalReadingTime` (내림차순)  
**용도**: 총 독서 시간 기준으로 사용자를 정렬

**참고**: 현재는 사용하지 않지만, 향후 독서 시간 기준 정렬 기능을 사용하려면 필요합니다.

### firestore.indexes.json 파일 예시

모든 인덱스를 한 번에 생성하려면:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "level",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "experience",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "totalReadingTime",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

**중요**: 
- **`level` 인덱스는 필수**입니다 (메인 페이지와 전체 순위 페이지에서 사용)
- `experience`와 `totalReadingTime` 인덱스는 현재 사용하지 않으므로 선택사항입니다
- 하지만 해당 기능을 사용하려면 반드시 생성해야 합니다

## 인덱스 생성 방법

### 방법 1: Firebase Console에서 수동 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. Firestore Database → Indexes 탭
4. "Create Index" 클릭
5. 위의 인덱스 정보 입력
6. "Create" 클릭

### 방법 2: Firebase CLI 사용
```bash
# firebase.json 파일에 firestore 설정 추가 후
firebase deploy --only firestore:indexes
```

### 방법 3: 에러 메시지에서 링크 클릭
애플리케이션 실행 중 인덱스가 필요하다는 에러가 발생하면, 에러 메시지에 포함된 링크를 클릭하여 자동으로 인덱스를 생성할 수 있습니다.

## 주의사항

- 인덱스 생성은 몇 분에서 몇 시간이 걸릴 수 있습니다 (데이터 양에 따라)
- 인덱스가 생성되는 동안 해당 쿼리는 실패할 수 있습니다
- 인덱스 생성이 완료되면 자동으로 쿼리가 작동합니다

## 현재 사용 중인 쿼리

### 리더보드 조회
- **컬렉션**: `users`
- **정렬**: `level` (내림차순)
- **필터**: 없음
- **제한**: 최대 1000개 (Firestore 기본 제한)

### 검색 기능
- 사용자 이름으로 검색하는 경우, 클라이언트 측에서 필터링하므로 별도 인덱스가 필요하지 않습니다.

## 데이터 구조 변경 사항

### users 컬렉션에 추가된 필드
- `level`: number (현재 레벨)
- `experience`: number (총 경험치)
- `totalReadingTime`: number (총 독서 시간, 초 단위)
- `levelDataMigrated`: boolean (레벨 데이터 마이그레이션 완료 여부)

이 필드들은 `userStatistics` 컬렉션에도 저장되며, 리더보드 조회는 `users` 컬렉션에서 직접 수행합니다.

---

## 콘텐츠 관련 인덱스 (필수) ⭐

책 상세 페이지와 탐색 페이지에서 사용하는 복합 쿼리를 위한 인덱스입니다.

### 4. quotes 컬렉션 - bookId + created_at (필수) ⭐

**컬렉션**: `quotes`  
**필터**: `bookId` (==)  
**정렬**: `created_at` (내림차순)  
**용도**: 책 상세 페이지에서 해당 책의 구절 기록 조회

**Firebase Console에서 설정:**
1. Firebase Console → Firestore Database → Indexes
2. "Create Index" 클릭
3. Collection ID: `quotes`
4. Fields to index:
   - Field: `bookId`, Query scope: `Collection`, Order: `Ascending`
   - Field: `created_at`, Order: `Descending`
5. "Create" 클릭

### 5. quotes 컬렉션 - user_id + created_at (필수) ⭐

**컬렉션**: `quotes`  
**필터**: `user_id` (==)  
**정렬**: `created_at` (내림차순)  
**용도**: 사용자의 모든 구절 기록 조회

**Firebase Console에서 설정:**
1. Collection ID: `quotes`
2. Fields to index:
   - Field: `user_id`, Order: `Ascending`
   - Field: `created_at`, Order: `Descending`

### 6. quotes 컬렉션 - isPublic + created_at (필수) ⭐

**컬렉션**: `quotes`  
**필터**: `isPublic` (== true)  
**정렬**: `created_at` (내림차순)  
**용도**: 탐색 페이지에서 공개된 구절 기록 조회

**Firebase Console에서 설정:**
1. Collection ID: `quotes`
2. Fields to index:
   - Field: `isPublic`, Order: `Ascending`
   - Field: `created_at`, Order: `Descending`

### 7. critiques 컬렉션 - bookId + created_at (필수) ⭐

**컬렉션**: `critiques`  
**필터**: `bookId` (==)  
**정렬**: `created_at` (내림차순)  
**용도**: 책 상세 페이지에서 해당 책의 서평 조회

**Firebase Console에서 설정:**
1. Collection ID: `critiques`
2. Fields to index:
   - Field: `bookId`, Order: `Ascending`
   - Field: `created_at`, Order: `Descending`

### 8. critiques 컬렉션 - user_id + created_at (필수) ⭐

**컬렉션**: `critiques`  
**필터**: `user_id` (==)  
**정렬**: `created_at` (내림차순)  
**용도**: 사용자의 모든 서평 조회

**Firebase Console에서 설정:**
1. Collection ID: `critiques`
2. Fields to index:
   - Field: `user_id`, Order: `Ascending`
   - Field: `created_at`, Order: `Descending`

### 9. critiques 컬렉션 - isPublic + created_at (필수) ⭐

**컬렉션**: `critiques`  
**필터**: `isPublic` (== true)  
**정렬**: `created_at` (내림차순)  
**용도**: 탐색 페이지에서 공개된 서평 조회

**Firebase Console에서 설정:**
1. Collection ID: `critiques`
2. Fields to index:
   - Field: `isPublic`, Order: `Ascending`
   - Field: `created_at`, Order: `Descending`

### 10. bookQuestions 컬렉션 - isPublic + created_at (필수) ⭐

**컬렉션**: `bookQuestions`  
**필터**: `isPublic` (== true)  
**정렬**: `created_at` (내림차순)  
**용도**: 탐색 페이지에서 공개된 독서 질문 조회

**Firebase Console에서 설정:**
1. Collection ID: `bookQuestions`
2. Fields to index:
   - Field: `isPublic`, Order: `Ascending`
   - Field: `created_at`, Order: `Descending`

### 11. readingSessions 컬렉션 - bookId + date (필수) ⭐

**컬렉션**: `readingSessions`  
**필터**: `bookId` (==)  
**정렬**: `date` (내림차순)  
**용도**: 책 상세 페이지에서 해당 책의 독서 세션 조회

**Firebase Console에서 설정:**
1. Collection ID: `readingSessions`
2. Fields to index:
   - Field: `bookId`, Order: `Ascending`
   - Field: `date`, Order: `Descending`

### 12. books 컬렉션 - isBookPublic + created_at (필수) ⭐

**컬렉션**: `books`  
**필터**: `isBookPublic` (== true)  
**정렬**: `created_at` (내림차순)  
**용도**: 기록 페이지에서 공개된 책 목록 조회

**Firebase Console에서 설정:**
1. Collection ID: `books`
2. Fields to index:
   - Field: `isBookPublic`, Order: `Ascending`
   - Field: `created_at`, Order: `Descending`

---

## 전체 인덱스 목록 (firestore.indexes.json)

모든 필수 인덱스를 한 번에 생성하려면:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "level",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "quotes",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "bookId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "quotes",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "user_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "quotes",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isPublic",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "critiques",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "bookId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "critiques",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "user_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "critiques",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isPublic",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "bookQuestions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isPublic",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "readingSessions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "bookId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "date",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "books",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isBookPublic",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

