"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface Settings {
  theme: "light" | "dark"
  fontSize: "small" | "medium" | "large"
  colorScheme: "blue" | "green" | "purple" | "orange"
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  resetSettings: () => void
}

const defaultSettings: Settings = {
  theme: "light",
  fontSize: "medium",
  colorScheme: "blue",
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    // 로컬 스토리지에서 설정 불러오기
    const savedSettings = localStorage.getItem("appSettings")
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings({ ...defaultSettings, ...parsedSettings })
      } catch (error) {
        console.error("Failed to parse saved settings:", error)
      }
    }
  }, [])

  useEffect(() => {
    // 설정이 변경될 때마다 로컬 스토리지에 저장
    localStorage.setItem("appSettings", JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    // HTML 요소에 테마 속성 적용
    const html = document.documentElement
    html.setAttribute("data-theme", settings.theme)
    html.setAttribute("data-color-scheme", settings.colorScheme)
    html.setAttribute("data-font-size", settings.fontSize)
  }, [settings])

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
