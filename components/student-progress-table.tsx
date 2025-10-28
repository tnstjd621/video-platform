"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface StudentProgressTableProps {
  students: Array<{ student_id: string; profiles: { name: string; email: string } }>
  classroomId: string
}

export function StudentProgressTable({ students, classroomId }: StudentProgressTableProps) {
  const supabase = createClient()
  const [progressData, setProgressData] = useState<any[]>([])

  useEffect(() => {
    const fetchProgress = async () => {
      if (students.length === 0) return
      const studentIds = students.map(s => s.student_id)

      const { data, error } = await supabase
        .from("student_progress")
        .select("student_id, video_id, watched_duration, completed")
        .in("student_id", studentIds)

      if (!error && data) {
        setProgressData(data)
      }
    }
    fetchProgress()
  }, [students])

  const getStudentProgress = (studentId: string) => {
    return progressData.filter(p => p.student_id === studentId)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">学生进度</h2>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">学生</th>
            <th className="border p-2">已完成视频数</th>
            <th className="border p-2">学习详情</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const sp = getStudentProgress(s.student_id)
            const completedCount = sp.filter(p => p.completed).length
            return (
              <tr key={s.student_id}>
                <td className="border p-2">{s.profiles?.name || s.profiles?.email}</td>
                <td className="border p-2">{completedCount}</td>
                <td className="border p-2 text-sm">
                  {sp.length > 0 ? (
                    sp.map((p, i) => (
                      <div key={i}>
                        视频 {p.video_id.slice(0, 6)}... - {p.completed ? "✅ 完成" : `进行中 (${p.watched_duration}s)`}
                      </div>
                    ))
                  ) : (
                    <span>暂无进度</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
