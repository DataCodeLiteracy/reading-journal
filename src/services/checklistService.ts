import { ApiClient } from "@/lib/apiClient"
import { UserChecklist } from "@/types/user"

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
    await this.createOrUpdateUserChecklist(user_id, {
      preReadingCompleted: true,
      lastPreReadingCheck: new Date(),
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

    await this.createOrUpdateUserChecklist(user_id, {
      longTermReminders: {
        ...currentReminders,
        [reminderId]: {
          lastReminded: new Date(),
          frequency,
        },
      },
    })
  }

  static isPreReadingCheckValid(userChecklist: UserChecklist | null): boolean {
    if (!userChecklist || !userChecklist.preReadingCompleted) {
      return false
    }

    // 오늘 체크했는지 확인
    const today = new Date().toISOString().split("T")[0]
    const lastCheck = userChecklist.lastPreReadingCheck
      ? new Date(userChecklist.lastPreReadingCheck).toISOString().split("T")[0]
      : null

    return lastCheck === today
  }
}
