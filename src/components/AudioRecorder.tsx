"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react"
import { WebSpeechService } from "@/services/speechService"

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcript?: string) => void
  onCancel?: () => void
  maxDuration?: number // 최대 녹음 시간 (초)
}

export default function AudioRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 기본 5분
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const speechServiceRef = useRef<WebSpeechService | null>(null)

  useEffect(() => {
    // 컴포넌트 언마운트 시 정리
    return () => {
      stopRecording()
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startRecording = async (): Promise<void> => {
    try {
      setError(null)
      setTranscript("")

      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        })
        setRecordedBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      // Web Speech API로 STT 시작 (선택)
      const speechService = new WebSpeechService()
      if (speechService.isRecognitionSupported()) {
        speechServiceRef.current = speechService
        try {
          const recognizedText = await speechService.startRecognition()
          setTranscript(recognizedText)
        } catch (err) {
          console.warn("Speech recognition failed:", err)
          // STT 실패해도 녹음은 계속
        }
      }

      // 녹음 시작
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1
          if (next >= maxDuration) {
            stopRecording()
            return prev
          }
          return next
        })
      }, 1000)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "녹음을 시작할 수 없습니다."
      setError(errorMessage)
      console.error("Error starting recording:", err)
    }
  }

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
    }

    if (speechServiceRef.current) {
      speechServiceRef.current.stopRecognition()
      speechServiceRef.current = null
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const pauseRecording = (): void => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const resumeRecording = (): void => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1
          if (next >= maxDuration) {
            stopRecording()
            return prev
          }
          return next
        })
      }, 1000)
    }
  }

  const handleSave = (): void => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob, transcript || undefined)
      // 정리
      setRecordedBlob(null)
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
      }
      setTranscript("")
      setRecordingTime(0)
    }
  }

  const handleCancel = (): void => {
    stopRecording()
    setRecordedBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setTranscript("")
    setRecordingTime(0)
    onCancel?.()
  }

  const handlePlay = (): void => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play()
    }
  }

  return (
    <div className='space-y-4'>
      {error && (
        <div className='p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
          <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
        </div>
      )}

      {!isRecording && !recordedBlob && (
        <button
          onClick={startRecording}
          className='w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors'
        >
          <Mic className='h-5 w-5' />
          녹음 시작
        </button>
      )}

      {isRecording && (
        <div className='space-y-3'>
          <div className='flex items-center justify-center gap-4'>
            <div className='text-center'>
              <div className='text-2xl font-mono text-accent-theme'>
                {formatTime(recordingTime)}
              </div>
              <div className='text-xs text-theme-secondary mt-1'>
                {isPaused ? "일시정지됨" : "녹음 중..."}
              </div>
            </div>
          </div>

          <div className='flex gap-2'>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className='flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors'
              >
                <Play className='h-4 w-4' />
                재개
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className='flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors'
              >
                <Pause className='h-4 w-4' />
                일시정지
              </button>
            )}
            <button
              onClick={stopRecording}
              className='flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors'
            >
              <Square className='h-4 w-4' />
              중지
            </button>
          </div>
        </div>
      )}

      {recordedBlob && audioUrl && (
        <div className='space-y-3'>
          <div className='p-3 bg-theme-tertiary rounded-lg'>
            <p className='text-sm text-theme-secondary mb-2'>녹음 완료</p>
            <p className='text-sm font-medium text-theme-primary'>
              {formatTime(recordingTime)}
            </p>
            {transcript && (
              <p className='text-xs text-theme-secondary mt-2'>
                인식된 텍스트: {transcript}
              </p>
            )}
          </div>

          <div className='flex gap-2'>
            <button
              onClick={handlePlay}
              className='flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors'
            >
              <Play className='h-4 w-4' />
              재생
            </button>
            <button
              onClick={handleCancel}
              className='flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors'
            >
              <Trash2 className='h-4 w-4' />
              취소
            </button>
          </div>

          <div className='flex gap-2'>
            <button
              onClick={handleSave}
              className='flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-accent-theme hover:bg-accent-theme-secondary text-white rounded-lg transition-colors'
            >
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

