// app/classrooms/[id]/student/[studentId]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default function StudentDetailPage() {
  const params = useParams()
  const classroomId = params?.id as string
  const studentId = params?.studentId as string
  const supabase = createClient()
  const router = useRouter()

  const [student, setStudent] = useState<any>(null)
  const [progressData, setProgressData] = useState<any[]>([])

  // 데이터 가져오기
  const fetchData = async () => {
    // 학생 정보
    const { data: s } = await supabase.from("profiles").select("id, name, email").eq("id", studentId).single()
    setStudent(s)

    // 학생의 진도 (영상 + 카테고리 포함)
    const { data: progress } = await supabase
      .from("student_progress")
      .select(`
        id,
        watched_duration,
        completed,
        videos (
          id,
          title,
          duration,
          categories (id, name)
        )
      `)
      .eq("student_id", studentId)

    setProgressData(progress || [])
  }

  useEffect(() => {
    if (studentId) fetchData()
  }, [studentId])

  // 개별 영상 진도율 계산
  const getVideoProgress = (p: any) => {
    if (!p.videos?.duration) return 0
    return Math.min(100, Math.round((p.watched_duration / p.videos.duration) * 100))
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>
            学生详情 - {student?.name || student?.email} （{student?.email}）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 返回 버튼 */}
          <Button variant="outline" onClick={() => router.push(`/classrooms/${classroomId}`)}>
            返回班级
          </Button>

          {/* 영상별 진도 */}
          <div>
            <h3 className="font-semibold mb-4">视频进度</h3>
            <ul className="space-y-3">
              {progressData.map((p) => (
                <li
                  key={p.id}
                  className="border p-3 rounded space-y-2"
                >
                  <p className="font-medium">
                    🎬 {p.videos?.title}{" "}
                    <span className="text-sm text-muted-foreground">
                      （分类: {p.videos?.categories?.name || "未分类"}）
                    </span>
                  </p>
                  <Progress value={getVideoProgress(p)} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>已观看: {Math.round(p.watched_duration)} 秒</span>
                    <span>总时长: {p.videos?.duration || 0} 秒</span>
                  </div>
                  {p.completed && (
                    <span className="text-green-600 text-sm font-semibold">✅ 已完成</span>
                  )}
                </li>
              ))}
              {progressData.length === 0 && (
                <p className="text-muted-foreground">暂无学习进度</p>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
