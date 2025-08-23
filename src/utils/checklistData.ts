import { ChecklistItem } from "@/types/user"

export const PRE_READING_CHECKLIST: ChecklistItem[] = [
  {
    id: "prep-1",
    title: "집중 방해 요소 제거",
    description:
      "집중 방해 요소(슬라임, 장난감 등)를 치우고 독서에 집중할 수 있는 환경을 만들기.",
    category: "pre-reading",
  },
  {
    id: "prep-2",
    title: "아이 컨디션 점검",
    description:
      "아이가 피곤하거나 집중 떨어질 징후가 보이면, 10분으로 유연 조정하거나 미리 읽기(가게/아침) 고려.",
    category: "pre-reading",
  },
  {
    id: "prep-3",
    title: "나이 차이 맞춤",
    description:
      "4살 차이 고려해 같은 책인지 따로 읽을지, 각자 수준(그림책 vs 소설)에 맞는지 확인.",
    category: "pre-reading",
  },
  {
    id: "prep-4",
    title: "이해 속도 조절",
    description:
      '아이가 제대로 이해할 속도로 읽을 계획 세우기 – 중간에 "이 부분 이해했어?" 질문 준비.',
    category: "pre-reading",
  },
  {
    id: "prep-5",
    title: "소통/질문 유도",
    description:
      '책 중 관심사(꿈, 강점)나 감정 이입(예: "이 상황 어때?") 포인트 미리 생각, 적절한 질문으로 대화 흐름 만들기.',
    category: "pre-reading",
  },
  {
    id: "prep-6",
    title: "집중 유지 전략",
    description:
      '후반 집중 떨어지면 텍스트 요약하며 대화로 마무리할 준비, 타이머로 "책 세상 들어가기" 루틴 시작.',
    category: "pre-reading",
  },
  {
    id: "prep-7",
    title: "부모 감정 관리",
    description:
      "읽기 전 감정 올라올 상황 피하고, 아이 장난 시 담담히 규칙 상기 – 심호흡으로 긍정 분위기 유지.",
    category: "pre-reading",
  },
  {
    id: "prep-8",
    title: "읽기 기술/어휘 준비",
    description:
      "속도/발음/내용 파악 연습, 모를 단어(예: 수도원) 간단 설명 미리 생각.",
    category: "pre-reading",
  },
]

export const LONG_TERM_CHECKLIST: ChecklistItem[] = [
  {
    id: "long-1",
    title: "책 접근성 확보",
    description:
      "아이들이 어디서든 책에 접근할 수 있게 책을 미리 준비하고, 독서 환경을 조성하기.",
    category: "long-term",
  },
  {
    id: "long-2",
    title: "장기 선언 유지",
    description:
      '"고등학생까지 매일 읽어줄게!" 다짐 상기, 아이들 앞에서 재확인하며 동기 부여.',
    category: "long-term",
  },
  {
    id: "long-3",
    title: "부모 모델링",
    description:
      "부모가 책을 좋아하고 자주 읽는 모습을 보여주기 – 아이들이 자연스럽게 따라오게.",
    category: "long-term",
  },
  {
    id: "long-4",
    title: "마음가짐 변화",
    description:
      "좋은 환경 만들기 위해 부모 태도부터 바꾸기 – 피곤할 때도 긍정적으로 접근.",
    category: "long-term",
  },
  {
    id: "long-5",
    title: "기록과 회고",
    description:
      "소통 순간/교훈/모르는 단어 매일 기록, 블로그나 앱으로 객관적 반성하며 개선.",
    category: "long-term",
  },
  {
    id: "long-6",
    title: "꾸준함과 유연 균형",
    description:
      "매일 목표 지키되, 강박 피하고 상황(예: 가족 모임)에 유연 – 책이 행복한 기억으로 남기기.",
    category: "long-term",
  },
]
