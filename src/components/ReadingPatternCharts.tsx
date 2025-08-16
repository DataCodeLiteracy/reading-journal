"use client"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js"
import { Doughnut, Bar } from "react-chartjs-2"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface TimeSlot {
  hour: number
  label: string
  count: number
  totalTime: number
  percentage: number
}

interface DayTimePattern {
  dayOfWeek: number
  dayName: string
  timeSlots: TimeSlot[]
  totalSessions: number
  totalTime: number
}

interface ReadingPatternChartsProps {
  overallTimeSlots: TimeSlot[]
  dayTimePatterns: DayTimePattern[]
}

export function ReadingPatternCharts({
  overallTimeSlots,
  dayTimePatterns,
}: ReadingPatternChartsProps) {
  // 시간대별 분포 도넛 차트 데이터
  const timeSlotChartData = {
    labels: overallTimeSlots
      .filter((slot) => slot.count > 0)
      .map((slot) => slot.label),
    datasets: [
      {
        data: overallTimeSlots
          .filter((slot) => slot.count > 0)
          .map((slot) => slot.count),
        backgroundColor: [
          "#3B82F6", // blue
          "#10B981", // green
          "#F59E0B", // yellow
          "#EF4444", // red
          "#8B5CF6", // purple
          "#F97316", // orange
          "#06B6D4", // cyan
          "#84CC16", // lime
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  }

  // 요일별 독서 빈도 막대 차트 데이터
  const dayChartData = {
    labels: dayTimePatterns
      .sort((a, b) => {
        if (a.dayOfWeek === 0) return 1
        if (b.dayOfWeek === 0) return -1
        return a.dayOfWeek - b.dayOfWeek
      })
      .map((day) => day.dayName),
    datasets: [
      {
        label: "독서 세션 수",
        data: dayTimePatterns
          .sort((a, b) => {
            if (a.dayOfWeek === 0) return 1
            if (b.dayOfWeek === 0) return -1
            return a.dayOfWeek - b.dayOfWeek
          })
          .map((day) => day.totalSessions),
        backgroundColor: "#3B82F6",
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }

  // 요일별 독서 시간 막대 차트 데이터
  const dayTimeChartData = {
    labels: dayTimePatterns
      .sort((a, b) => {
        if (a.dayOfWeek === 0) return 1
        if (b.dayOfWeek === 0) return -1
        return a.dayOfWeek - b.dayOfWeek
      })
      .map((day) => day.dayName),
    datasets: [
      {
        label: "총 독서 시간 (분)",
        data: dayTimePatterns
          .sort((a, b) => {
            if (a.dayOfWeek === 0) return 1
            if (b.dayOfWeek === 0) return -1
            return a.dayOfWeek - b.dayOfWeek
          })
          .map((day) => Math.round(day.totalTime / 60)),
        backgroundColor: "#10B981",
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#3B82F6",
        borderWidth: 1,
      },
    },
  }

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div className='space-y-6'>
      {/* 시간대별 분포 도넛 차트 */}
      <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
        <h3 className='text-lg font-semibold text-theme-primary mb-4'>
          🍩 시간대별 독서 분포
        </h3>
        <div className='h-64'>
          <Doughnut data={timeSlotChartData} options={chartOptions} />
        </div>
      </div>

      {/* 요일별 독서 빈도 막대 차트 */}
      <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
        <h3 className='text-lg font-semibold text-theme-primary mb-4'>
          📊 요일별 독서 빈도
        </h3>
        <div className='h-64'>
          <Bar data={dayChartData} options={barChartOptions} />
        </div>
      </div>

      {/* 요일별 독서 시간 막대 차트 */}
      <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
        <h3 className='text-lg font-semibold text-theme-primary mb-4'>
          ⏱️ 요일별 독서 시간
        </h3>
        <div className='h-64'>
          <Bar data={dayTimeChartData} options={barChartOptions} />
        </div>
      </div>
    </div>
  )
}
