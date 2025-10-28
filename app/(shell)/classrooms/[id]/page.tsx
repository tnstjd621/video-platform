// app/classrooms/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

export default function ClassroomDetailPage() {
  const params = useParams()
  const classroomId = params?.id as string
  const supabase = createClient()
  const router = useRouter()

  const [classroom, setClassroom] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [progressData, setProgressData] = useState<any[]>([])
  const [notices, setNotices] = useState<any[]>([])
  const [newNotice, setNewNotice] = useState("")
  const [loading, setLoading] = useState(false)

  // ✅ 반 정보 + 학생 + 공지 불러오기
  const fetchData = async () => {
    // 반 정보
    const { data: cls } = await supabase.from("classrooms").select("*").eq("id", classroomId).single()
    setClassroom(cls)

    // 반 학생
    const { data: members } = await supabase
      .from("classroom_students")
      .select("profiles(id, name, email)")
      .eq("classroom_id", classroomId)
    setStudents(members?.map((m) => m.profiles) || [])

    // 학생별 학습 진도
    const { data: progress } = await supabase
      .from("student_progress")
      .select("student_id, video_id, watched_duration, completed, videos(duration, title, category_id)")
      .in("student_id", members?.map((m) => m.profiles.id) || [])
    setProgressData(progress || [])

    // 공지
    const { data: ns } = await supabase
      .from("classroom_notices")
      .select("*")
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false })
    setNotices(ns || [])
  }

  useEffect(() => {
    if (classroomId) fetchData()
  }, [classroomId])

  // ✅ 공지 추가
  const handleAddNotice = async () => {
    if (!newNotice) return
    setLoading(true)
    const { error } = await supabase.from("classroom_notices").insert({
      classroom_id: classroomId,
      content: newNotice,
    })
    if (!error) {
      setNewNotice("")
      fetchData()
    }
    setLoading(false)
  }

  // ✅ 공지 삭제
  const handleDeleteNotice = async (id: string) => {
    if (!confirm("确定要删除这条公告吗？")) return
    await supabase.from("classroom_notices").delete().eq("id", id)
    fetchData()
  }

  // 학생별 전체 진도율 계산
  const getStudentProgress = (studentId: string) => {
    const records = progressData.filter((p) => p.student_id === studentId)
    if (records.length === 0) return 0
    const total = records.reduce((acc, r) => acc + (r.videos?.duration || 0), 0)
    const watched = records.reduce((acc, r) => acc + (r.watched_duration || 0), 0)
    if (total === 0) return 0
    return Math.min(100, Math.round((watched / total) * 100))
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>班级详情 - {classroom?.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* ✅ 학생 진도 리스트 */}
          <div>
            <h3 className="font-semibold mb-4">学生进度</h3>
            <ul className="space-y-3">
              {students.map((s) => {
                const progress = getStudentProgress(s.id)
                return (
                  <li
                    key={s.id}
                    className="flex justify-between items-center border p-3 rounded"
                  >
                    <div>
                      <p className="font-medium">{s.name || s.email}</p>
                      <p className="text-sm text-muted-foreground">{s.email}</p>
                    </div>
                    <div className="w-1/2">
                      <Progress value={progress} />
                      <p className="text-sm text-muted-foreground mt-1">
                        总进度: {progress}%
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/classrooms/${classroomId}/student/${s.id}`)}
                    >
                      详情
                    </Button>
                  </li>
                )
              })}
              {students.length === 0 && <p className="text-muted-foreground">暂无学生</p>}
            </ul>
          </div>

          {/* ✅ 公告管理 */}
          <div>
            <h3 className="font-semibold mb-4">公告</h3>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="输入公告内容"
                value={newNotice}
                onChange={(e) => setNewNotice(e.target.value)}
              />
              <Button onClick={handleAddNotice} disabled={loading}>
                {loading ? "发布中..." : "发布"}
              </Button>
            </div>
            <ul className="space-y-2">
              {notices.map((n) => (
                <li key={n.id} className="flex justify-between items-center border p-2 rounded">
                  <span>{n.content}</span>
                  <Button variant="destructive" onClick={() => handleDeleteNotice(n.id)}>
                    删除
                  </Button>
                </li>
              ))}
              {notices.length === 0 && <p className="text-muted-foreground">暂无公告</p>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
