// app/supervisor/classrooms/[id]/page.tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, User } from "lucide-react"

export default async function ClassroomDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // 반 정보
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("*")
    .eq("id", params.id)
    .single()

  if (!classroom) redirect("/supervisor/classrooms")

  // supervisor 본인 반인지 확인
  if (classroom.supervisor_id !== user.id) redirect("/supervisor/classrooms")

  // 학생 목록
  const { data: students } = await supabase
    .from("classroom_students")
    .select("student_id, profiles(id, name, email)")
    .eq("classroom_id", params.id)

  // 공지 목록
  const { data: announcements } = await supabase
    .from("classroom_announcements")
    .select("*")
    .eq("classroom_id", params.id)
    .order("created_at", { ascending: false })

  return (
    <div className="container p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{classroom.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">管理员视图</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/supervisor/classrooms">← 返回班级列表</Link>
        </Button>
      </div>

      {/* 학생 목록 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">学生列表</h2>

        {!students || students.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无学生
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((s) => {
              const profile = s.profiles as { id: string; name: string; email: string } | null
              if (!profile) return null

              return (
                <Card key={s.student_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {profile.name ?? "이름 없음"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </CardHeader>
                  <CardContent>
                    <Button asChild size="sm" className="w-full gap-2">
                      <Link href={`/supervisor/classrooms/${params.id}/students/${profile.id}`}>
                        <MessageCircle className="w-4 h-4" />
                        查看聊天 & 文件
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 공지 목록 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">公告列表</h2>
        {!announcements || announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无公告</p>
        ) : (
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className="border p-3 rounded-lg">
                <strong>{a.title}</strong>
                <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}