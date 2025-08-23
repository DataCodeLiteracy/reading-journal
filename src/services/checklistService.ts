import { ApiClient } from "@/lib/apiClient"
import { UserChecklist, SystemChecklist } from "@/types/user"

export class ChecklistService {
  static async getUserChecklist(
    user_id: string
  ): Promise<UserChecklist | null> {
    try {
      const result = await ApiClient.getDocument<UserChecklist>(
        "userChecklists",
        user_id
      )
      return result
    } catch (error) {
      console.error("ChecklistService.getUserChecklist error:", error)
      return null
    }
  }

  static async getSystemChecklist(
    type: "pre-reading" | "long-term"
  ): Promise<SystemChecklist | null> {
    try {
      const result = await ApiClient.getDocument<SystemChecklist>(
        "systemChecklists",
        type
      )
      return result
    } catch (error) {
      console.error("ChecklistService.getSystemChecklist error:", error)
      return null
    }
  }

  static async createOrUpdateUserChecklist(
    user_id: string,
    checklistData: Partial<UserChecklist>
  ): Promise<void> {
    try {
      const existingChecklist = await this.getUserChecklist(user_id)

      if (existingChecklist) {
        await ApiClient.updateDocument("userChecklists", user_id, {
          ...checklistData,
          updated_at: ApiClient.getServerTimestamp(),
        })
      } else {
        await ApiClient.createDocument("userChecklists", user_id, {
          user_id,
          preReadingCompleted: false,
          longTermReminders: {},
          ...checklistData,
          updated_at: ApiClient.getServerTimestamp(),
        })
      }
    } catch (error) {
      console.error(
        "ChecklistService.createOrUpdateUserChecklist error:",
        error
      )
      throw error
    }
  }

  static async markPreReadingCompleted(user_id: string): Promise<void> {
    const now = new Date()

    // 날짜 유효성 확인
    if (isNaN(now.getTime())) {
      throw new Error("Invalid date")
    }

    await this.createOrUpdateUserChecklist(user_id, {
      preReadingCompleted: true,
      lastPreReadingCheck: now,
    })
  }

  static async resetPreReadingCheck(user_id: string): Promise<void> {
    await this.createOrUpdateUserChecklist(user_id, {
      preReadingCompleted: false,
    })
  }

  static async updateLongTermReminder(
    user_id: string,
    reminderId: string,
    frequency: "daily" | "weekly" | "monthly"
  ): Promise<void> {
    const existingChecklist = await this.getUserChecklist(user_id)
    const currentReminders = existingChecklist?.longTermReminders || {}
    const now = new Date()

    // 날짜 유효성 확인
    if (isNaN(now.getTime())) {
      throw new Error("Invalid date")
    }

    await this.createOrUpdateUserChecklist(user_id, {
      longTermReminders: {
        ...currentReminders,
        [reminderId]: {
          lastReminded: now,
          frequency,
        },
      },
    })
  }

  static async createOrUpdateSystemChecklist(
    checklistData: SystemChecklist
  ): Promise<void> {
    try {
      await ApiClient.createDocument("systemChecklists", checklistData.id, {
        ...checklistData,
        updated_at: ApiClient.getServerTimestamp(),
      })
    } catch (error) {
      console.error(
        "ChecklistService.createOrUpdateSystemChecklist error:",
        error
      )
      throw error
    }
  }

  static async deleteSystemChecklist(checklistId: string): Promise<void> {
    try {
      await ApiClient.deleteDocument("systemChecklists", checklistId)
    } catch (error) {
      console.error("ChecklistService.deleteSystemChecklist error:", error)
      throw error
    }
  }

  static isPreReadingCheckValid(userChecklist: UserChecklist | null): boolean {
    if (!userChecklist || !userChecklist.preReadingCompleted) {
      return false
    }

    // lastPreReadingCheck가 없으면 false
    if (!userChecklist.lastPreReadingCheck) {
      return false
    }

    try {
      // 디버깅을 위한 로깅
      console.log(
        "Checking lastPreReadingCheck:",
        userChecklist.lastPreReadingCheck
      )

      // Firestore Timestamp를 Date로 변환
      const lastCheckDate = this.convertTimestampToDate(
        userChecklist.lastPreReadingCheck
      )

      if (!lastCheckDate) {
        console.warn(
          "Could not convert lastPreReadingCheck to valid date:",
          userChecklist.lastPreReadingCheck
        )
        return false
      }

      // 오늘 체크했는지 확인 (로컬 시간 기준)
      const today = new Date()
      const todayLocal =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0")

      const lastCheckLocal =
        lastCheckDate.getFullYear() +
        "-" +
        String(lastCheckDate.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(lastCheckDate.getDate()).padStart(2, "0")

      console.log(
        "Today (local):",
        todayLocal,
        "Last check (local):",
        lastCheckLocal
      )

      return lastCheckLocal === todayLocal
    } catch (error) {
      console.error("Error checking pre-reading check validity:", error)
      // 에러 발생 시 false 반환
      return false
    }
  }

  // Firestore Timestamp를 Date로 변환하는 헬퍼 함수
  static convertTimestampToDate(timestamp: any): Date | null {
    if (!timestamp) return null

    try {
      if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
        // Firestore Timestamp 객체
        return timestamp.toDate()
      } else if (timestamp instanceof Date) {
        // 이미 Date 객체인 경우
        return timestamp
      } else {
        // 문자열이나 다른 형태인 경우
        const date = new Date(timestamp)
        return isNaN(date.getTime()) ? null : date
      }
    } catch (error) {
      console.error("Error converting timestamp to date:", error)
      return null
    }
  }

  // 기본 체크리스트 데이터 (Fallback용)
  static getDefaultPreReadingChecklist() {
    return [
      {
        id: "prep-1",
        title: "집중 방해 요소 제거",
        description:
          "집중 방해 요소(슬라임, 장난감 등)를 치우고 독서에 집중할 수 있는 환경을 만들기.",
        category: "pre-reading" as const,
      },
      {
        id: "prep-2",
        title: "아이 컨디션 점검",
        description:
          "아이가 피곤하거나 집중 떨어질 징후가 보이면, 10분으로 유연 조정하거나 미리 읽기(가게/아침) 고려.",
        category: "pre-reading" as const,
      },
      {
        id: "prep-3",
        title: "나이 차이 맞춤",
        description:
          "4살 차이 고려해 같은 책인지 따로 읽을지, 각자 수준(그림책 vs 소설)에 맞는지 확인.",
        category: "pre-reading" as const,
      },
      {
        id: "prep-4",
        title: "이해 속도 조절",
        description:
          '아이가 제대로 이해할 속도로 읽을 계획 세우기 – 중간에 "이 부분 이해했어?" 질문 준비.',
        category: "pre-reading" as const,
      },
      {
        id: "prep-5",
        title: "소통/질문 유도",
        description:
          '책 중 관심사(꿈, 강점)나 감정 이입(예: "이 상황 어때?") 포인트 미리 생각, 적절한 질문으로 대화 흐름 만들기.',
        category: "pre-reading" as const,
      },
      {
        id: "prep-6",
        title: "집중 유지 전략",
        description:
          '후반 집중 떨어지면 텍스트 요약하며 대화로 마무리할 준비, 타이머로 "책 세상 들어가기" 루틴 시작.',
        category: "pre-reading" as const,
      },
      {
        id: "prep-7",
        title: "부모 감정 관리",
        description:
          "읽기 전 감정 올라올 상황 피하고, 아이 장난 시 담담히 규칙 상기 – 심호흡으로 긍정 분위기 유지.",
        category: "pre-reading" as const,
      },
      {
        id: "prep-8",
        title: "읽기 기술/어휘 준비",
        description:
          "속도/발음/내용 파악 연습, 모를 단어(예: 수도원) 간단 설명 미리 생각.",
        category: "pre-reading" as const,
      },
    ]
  }

  static getDefaultLongTermChecklist() {
    return [
      {
        id: "long-1",
        title: "책 접근성 확보",
        description:
          "아이들이 어디서든 책에 접근할 수 있게 책을 미리 준비하고, 독서 환경을 조성하기.",
        category: "long-term" as const,
      },
      {
        id: "long-2",
        title: "장기 선언 유지",
        description:
          '"고등학생까지 매일 읽어줄게!" 다짐 상기, 아이들 앞에서 재확인하며 동기 부여.',
        category: "long-term" as const,
      },
      {
        id: "long-3",
        title: "부모 모델링",
        description:
          "부모가 책을 좋아하고 자주 읽는 모습을 보여주기 – 아이들이 자연스럽게 따라오게.",
        category: "long-term" as const,
      },
      {
        id: "long-4",
        title: "마음가짐 변화",
        description:
          "좋은 환경 만들기 위해 부모 태도부터 바꾸기 – 피곤할 때도 긍정적으로 접근.",
        category: "long-term" as const,
      },
      {
        id: "long-5",
        title: "기록과 회고",
        description:
          "소통 순간/교훈/모르는 단어 매일 기록, 블로그나 앱으로 객관적 반성하며 개선.",
        category: "long-term" as const,
      },
      {
        id: "long-6",
        title: "꾸준함과 유연 균형",
        description:
          "매일 목표 지키되, 강박 피하고 상황(예: 가족 모임)에 유연 – 책이 행복한 기억으로 남기기.",
        category: "long-term" as const,
      },
    ]
  }
}
