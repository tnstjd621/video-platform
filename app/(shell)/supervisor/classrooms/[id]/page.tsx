// app/supervisor/classrooms/[id]/page.tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, ArrowLeft, Users } from "lucide-react"

export default async function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("*")
    .eq("id", id)
    .single()

  if (!classroom) redirect("/supervisor/classrooms")

  // supervisor_id 대신 classroom_supervisors 조인 테이블로 권한 체크
  const { data: membership } = await supabase
    .from("classroom_supervisors")
    .select("id")
    .eq("classroom_id", id)
    .eq("supervisor_id", user.id)
    .maybeSingle()

  if (!membership) redirect("/supervisor/classrooms")

  const { data: students } = await supabase
    .from("classroom_students")
    .select("student_id, profiles(id, name, email)")
    .eq("classroom_id", id)

  const { data: announcements } = await supabase
    .from("classroom_announcements")
    .select("*")
    .eq("classroom_id", id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{classroom.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">管理员视图</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/supervisor/classrooms">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回班级列表
            </Link>
          </Button>
        </div>

        {/* 학생 목록 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">学生列表</h2>
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {students?.length ?? 0} 名
            </Badge>
          </div>

          {!students || students.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
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
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {profile.name?.[0] ?? "?"}
                          </span>
                        </div>
                        {profile.name ?? "이름 없음"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </CardHeader>
                    <CardContent>
                      <Button asChild size="sm" className="w-full gap-2">
                        <Link href={`/supervisor/classrooms/${id}/students/${profile.id}`}>
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
          <h2 className="text-lg font-semibold">公告列表</h2>
          {!announcements || announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无公告</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className="border rounded-lg p-4">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}