import { ISpeechService } from "@/types/question"

// Web Speech API 타입 정의
interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}

// Window 인터페이스 확장 타입
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

/**
 * Web Speech API를 사용한 Speech Service 구현
 * 추후 다른 STT/TTS 서비스로 교체 가능하도록 인터페이스 기반으로 구현
 */
export class WebSpeechService implements ISpeechService {
  private recognition: SpeechRecognition | null = null
  private synthesis: SpeechSynthesis | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.synthesis = window.speechSynthesis
    }
  }

  /**
   * 음성 인식 시작
   * @returns 인식된 텍스트
   */
  async startRecognition(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(
          new Error("Speech recognition is not available in this environment")
        )
        return
      }

      const windowWithSpeech = window as WindowWithSpeechRecognition
      const SpeechRecognitionConstructor:
        | (new () => SpeechRecognition)
        | undefined =
        windowWithSpeech.SpeechRecognition ||
        windowWithSpeech.webkitSpeechRecognition

      if (!SpeechRecognitionConstructor) {
        reject(new Error("Speech recognition is not supported in this browser"))
        return
      }

      const recognition = new SpeechRecognitionConstructor()
      this.recognition = recognition
      recognition.lang = "ko-KR" // 한국어 설정
      recognition.continuous = false // 단일 결과만 반환
      recognition.interimResults = false // 최종 결과만 반환

      let finalTranscript = ""

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          }
        }
      }

      recognition.onend = () => {
        if (finalTranscript) {
          resolve(finalTranscript.trim())
        } else {
          reject(new Error("No speech was recognized"))
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        reject(new Error(`Speech recognition error: ${event.error}`))
      }

      recognition.start()
    })
  }

  /**
   * 음성 인식 중지
   */
  stopRecognition(): void {
    if (this.recognition) {
      this.recognition.stop()
      this.recognition = null
    }
  }

  /**
   * 텍스트를 음성으로 변환
   * @param text 변환할 텍스트
   * @returns 오디오 Blob
   */
  async synthesize(text: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error("Speech synthesis is not available"))
        return
      }

      // Web Speech API의 SpeechSynthesis는 직접 Blob을 반환하지 않으므로
      // MediaRecorder를 사용하여 오디오를 녹음해야 합니다.
      // 이는 복잡하므로, 일단 기본 구현만 제공하고
      // 실제 사용 시에는 MediaRecorder와 함께 사용해야 합니다.
      reject(
        new Error(
          "Direct Blob synthesis is not supported. Use MediaRecorder with SpeechSynthesis instead."
        )
      )
    })
  }

  /**
   * 음성 인식 지원 여부 확인
   */
  isRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false

    const windowWithSpeech = window as WindowWithSpeechRecognition
    const SpeechRecognitionConstructor:
      | (new () => SpeechRecognition)
      | undefined =
      windowWithSpeech.SpeechRecognition ||
      windowWithSpeech.webkitSpeechRecognition

    return !!SpeechRecognitionConstructor
  }

  /**
   * 음성 합성 지원 여부 확인
   */
  isSynthesisSupported(): boolean {
    if (typeof window === "undefined") return false
    return !!window.speechSynthesis
  }

  /**
   * 텍스트를 음성으로 재생 (Blob 반환 없이 직접 재생)
   * @param text 재생할 텍스트
   * @param voice 언어 설정 (기본값: "ko-KR")
   */
  speak(text: string, voice: string = "ko-KR"): void {
    if (!this.synthesis) {
      console.error("Speech synthesis is not available")
      return
    }

    // 기존 재생 중인 음성 중지
    this.synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = voice
    utterance.rate = 1.0 // 속도
    utterance.pitch = 1.0 // 음높이
    utterance.volume = 1.0 // 볼륨

    this.synthesis.speak(utterance)
  }

  /**
   * 음성 재생 중지
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
    }
  }
}

// 전역 타입 확장 (Web Speech API)
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}
