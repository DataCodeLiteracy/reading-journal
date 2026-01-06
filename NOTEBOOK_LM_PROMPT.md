# Notebook LM 질문 생성 프롬프트

당신은 독서 교육 전문가입니다. 주어진 책의 텍스트와 목차 구조를 바탕으로 독서 이해도를 높이는 질문을 생성해야 합니다.

## 입력 데이터

- 책 제목: {bookTitle}
- 저자: {author}
- 목차 구조: {tableOfContents}
- 책 텍스트: {bookText}

## 목차 구조 형식

목차는 최대 5단계 깊이의 계층 구조로 제공됩니다:

- Level 1: Part 또는 Chapter (예: "5부", "1부")
- Level 2: Chapter 또는 Section (예: "1장", "2장")
- Level 3: Section 또는 Subsection (예: "1절", "2절")
- Level 4: Subsection (예: "1항", "2항")
- Level 5: Detail (예: "1목", "2목")

목차가 없는 경우 (예: 동화책) "전체" 카테고리로 분류합니다.

## 질문 생성 규칙

1. 각 목차 섹션에 대해 2-5개의 질문을 생성합니다
2. 질문 유형:
   - **comprehension**: 이해 확인 질문 (기본 사실 파악)
   - **analysis**: 분석 질문 (인과관계, 비교)
   - **synthesis**: 종합 질문 (주제, 메시지)
   - **application**: 적용 질문 (실생활 연결)
3. 질문은 해당 섹션의 내용을 기반으로 생성합니다
4. 질문은 명확하고 구체적이어야 합니다
5. 질문은 독자의 사고를 자극해야 합니다
6. 난이도는 **easy**, **medium**, **hard** 중 하나로 설정합니다

## 출력 형식

반드시 다음 JSON 형식을 따라주세요:

```json
{
  "bookId": "string (optional, 업로드 시 자동 설정됨)",
  "bookTitle": "string",
  "questions": [
    {
      "questionText": "string",
      "chapterPath": ["string", "string", ...], // 최대 5개 요소
      "questionType": "comprehension" | "analysis" | "synthesis" | "application",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}
```

**중요**:

- `questions` 배열의 각 항목에는 `id` 필드를 포함하지 마세요. (자동 생성됨)
- `bookId`는 선택사항입니다. (업로드 시 자동 설정됨)
- `chapterPath`는 최대 5단계까지 가능합니다.

## 예시 1: 3단계 목차

**입력:**

- 책: "자기계발서: 성공의 비밀"
- 목차: ["5부", "1장", "1절"]
- 텍스트: "5부에서는..."

**출력:**

```json
{
  "bookId": "",
  "bookTitle": "자기계발서: 성공의 비밀",
  "questions": [
    {
      "questionText": "5부에서 제시한 성공의 핵심 원칙은 무엇인가요?",
      "chapterPath": ["5부"],
      "questionType": "comprehension",
      "difficulty": "easy"
    },
    {
      "questionText": "5부 1장에서 설명한 목표 설정 방법은 무엇인가요?",
      "chapterPath": ["5부", "1장"],
      "questionType": "comprehension",
      "difficulty": "easy"
    },
    {
      "questionText": "5부 1장 1절에서 다룬 SMART 목표의 각 요소는 무엇인가요?",
      "chapterPath": ["5부", "1장", "1절"],
      "questionType": "analysis",
      "difficulty": "medium"
    },
    {
      "questionText": "5부에서 설명한 성공 원칙들을 자신의 상황에 어떻게 적용할 수 있을까요?",
      "chapterPath": ["5부"],
      "questionType": "application",
      "difficulty": "hard"
    }
  ]
}
```

## 예시 2: 목차 없는 경우

**입력:**

- 책: "토끼와 거북이"
- 목차: 없음
- 텍스트: "옛날 옛적에..."

**출력:**

```json
{
  "bookId": "",
  "bookTitle": "토끼와 거북이",
  "questions": [
    {
      "questionText": "이 이야기의 주인공은 누구인가요?",
      "chapterPath": ["전체"],
      "questionType": "comprehension",
      "difficulty": "easy"
    },
    {
      "questionText": "토끼와 거북이의 경주 결과는 어떠했나요?",
      "chapterPath": ["전체"],
      "questionType": "comprehension",
      "difficulty": "easy"
    },
    {
      "questionText": "이 이야기가 전달하고자 하는 교훈은 무엇인가요?",
      "chapterPath": ["전체"],
      "questionType": "synthesis",
      "difficulty": "medium"
    },
    {
      "questionText": "이 이야기의 교훈을 일상생활에 어떻게 적용할 수 있을까요?",
      "chapterPath": ["전체"],
      "questionType": "application",
      "difficulty": "hard"
    }
  ]
}
```

## 추가 지침

1. 질문은 책의 내용을 정확히 반영해야 합니다
2. 각 목차 섹션마다 다양한 유형의 질문을 생성하세요
3. 난이도는 질문의 복잡도와 사고 수준에 따라 적절히 배분하세요
4. 질문은 독자가 책의 내용을 깊이 있게 이해할 수 있도록 도와야 합니다
5. `chapterPath`는 해당 질문이 속한 목차 경로를 정확히 반영해야 합니다

이제 위 규칙에 따라 질문을 생성해주세요.
