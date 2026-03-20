// app/admin/classrooms/[id]/manage/page.tsx
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { adminSupabase } from "@/lib/supabase/admin"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import StudentAssigner from "@/components/classrooms/student-assigner"
import { ArrowLeft, Users, School, Calendar } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }> // ✅ Next.js 15/16
}

export default async function ClassroomManagePage({ params }: PageProps) {
  // ✅ await로 unwrap
  const { id: classroomId } = await params

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["owner", "administrator"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, supervisor_id, created_at")
    .eq("id", classroomId)
    .single()

  if (!classroom) redirect("/admin/classrooms")

  // supervisor 정보
  const { data: supervisor } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", classroom.supervisor_id)
    .single()

  const { data: csRows = [] } = await supabase
    .from("classroom_students")
    .select("student_id")
    .eq("classroom_id", classroomId)

  const studentIds = csRows.map((r) => r.student_id)

  const profiles =
    studentIds.length > 0
      ? (await adminSupabase.from("profiles").select("id, name, email").in("id", studentIds)).data ?? []
      : []

  const existingStudents = profiles.map((p) => ({
    student_id: p.id as string,
    name: (p as any).name as string,
    email: (p as any).email as string,
  }))

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <School className="w-6 h-6 text-primary" />
              管理班级
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              配置班级信息与学生分配
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/classrooms">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Link>
          </Button>
        </div>

        {/* 반 정보 카드 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <School className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold">{classroom.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {supervisor ? (
                    <Badge variant="outline" className="text-xs">
                      班主任：{supervisor.name}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">未指定班主任</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="w-3 h-3" />
                    {studentIds.length} 名学生
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(classroom.created_at).toLocaleDateString("zh-CN")}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 학생 배정 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              学生分配
            </CardTitle>
            <CardDescription>
              搜索并添加学生到该班级，或移除已有学生
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudentAssigner
              classroomId={classroom.id}
              existingStudents={existingStudents}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}