// app/admin/classrooms/[id]/manage/page.tsx
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { adminSupabase } from "@/lib/supabase/admin"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import StudentAssigner from "@/components/classrooms/student-assigner"

interface PageProps {
  params: { id: string }
}

export default async function ClassroomManagePage({ params }: PageProps) {
  const supabase = await createClient()
  const classroomId = params.id

  // ✅ 로그인 체크
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // ✅ 권한 체크 (owner/administrator)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["owner", "administrator"].includes(profile.role)) {
    redirect("/dashboard")
  }

  // ✅ 반 기본 정보
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, supervisor_id, created_at")
    .eq("id", classroomId)
    .single()
  if (!classroom) redirect("/admin/classrooms")

  // ✅ 현재 배정된 학생 ID 목록
  const { data: csRows = [] } = await supabase
    .from("classroom_students")
    .select("student_id")
    .eq("classroom_id", classroomId)

  const studentIds = csRows.map((r) => r.student_id)

  // ✅ 이름/이메일은 Service Role로 조회 (RLS 영향 X)
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">管理班级</h1>
          <p className="text-muted-foreground">{classroom.name} - 学生分配</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/classrooms">返回</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>学生分配</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentAssigner classroomId={classroom.id} existingStudents={existingStudents} />
        </CardContent>
      </Card>
    </div>
  )
}
