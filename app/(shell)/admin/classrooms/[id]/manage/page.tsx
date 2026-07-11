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
import SupervisorAssigner from "@/components/classrooms/supervisor-assigner"
import { ArrowLeft, Users, School, Calendar, UserCog } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClassroomManagePage({ params }: PageProps) {
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
    .select("id, name, created_at")
    .eq("id", classroomId)
    .single()

  if (!classroom) redirect("/admin/classrooms")

  // 이 반에 배정된 supervisor 전체 조회
  const { data: csRows, error: csError } = await supabase
  .from("classroom_supervisors")
  .select("supervisor_id")
  .eq("classroom_id", classroomId)

if (csError) {
  console.error("classroom_supervisors 조회 에러:", csError)
}

const supervisorIds = (csRows ?? []).map((r) => r.supervisor_id)

  const supervisors =
    supervisorIds.length > 0
      ? (await adminSupabase.from("profiles").select("id, name, email").in("id", supervisorIds)).data ?? []
      : []

  const existingSupervisors = supervisors.map((s: any) => ({
    supervisor_id: s.id as string,
    name: s.name as string,
    email: s.email as string,
  }))

  const { data: studentRows } = await supabase
  .from("classroom_students")
  .select("student_id")
  .eq("classroom_id", classroomId)

  const studentIds = (studentRows ?? []).map((r) => r.student_id)

  const studentProfiles =
    studentIds.length > 0
      ? (await adminSupabase.from("profiles").select("id, name, email").in("id", studentIds)).data ?? []
      : []

  const existingStudents = studentProfiles.map((p) => ({
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
                  {supervisors.length > 0 ? (
                    supervisors.map((s: any) => (
                      <Badge key={s.id} variant="outline" className="text-xs gap-1">
                        <UserCog className="w-3 h-3" />
                        {s.name}
                      </Badge>
                    ))
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

        {/* 班主任 배정 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              班主任分配
            </CardTitle>
            <CardDescription>
              为该班级分配一位或多位班主任
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupervisorAssigner
              classroomId={classroom.id}
              existingSupervisors={existingSupervisors}
            />
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