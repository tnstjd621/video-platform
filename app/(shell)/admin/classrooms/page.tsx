// app/admin/classrooms/page.tsx
export const dynamic = "force-dynamic"; // ✅ 캐시 방지 (또는 export const revalidate = 0)

import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ClassroomCreateForm from "@/components/classrooms/classroom-create-form"

export default async function ClassroomsPage() {
  const supabase = await createClient()

  // 로그인 체크
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // 권한 체크
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profileErr || !profile || !["owner", "administrator"].includes(profile.role)) {
    redirect("/dashboard")
  }

  // supervisors
  const {
    data: supervisorsData,
    error: supervisorsErr,
  } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "supervisor")
    .order("name")

  const supervisors = supervisorsData ?? []
  const supervisorsErrorMsg = supervisorsErr?.message

  // classrooms (조인 제거)
  const {
    data: classroomsData,
    error: classroomsErr,
  } = await supabase
    .from("classrooms")
    .select("id, name, supervisor_id, created_at")
    .order("created_at", { ascending: false })

  const classrooms = classroomsData ?? []
  const classroomsErrorMsg = classroomsErr?.message

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">班级管理</h1>
          <p className="text-muted-foreground">创建和管理学习小组</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">返回仪表板</Link>
        </Button>
      </div>

      {/* (선택) 서버 에러 보조 출력 — 개발 중에만 유용 */}
      {(supervisorsErrorMsg || classroomsErrorMsg) && (
        <Card className="mb-6">
          <CardContent className="text-red-600 text-sm py-3">
            {supervisorsErrorMsg && <div>supervisors 错误: {supervisorsErrorMsg}</div>}
            {classroomsErrorMsg && <div>classrooms 错误: {classroomsErrorMsg}</div>}
          </CardContent>
        </Card>
      )}

      {/* 새 반 만들기 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>创建新班级</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassroomCreateForm supervisors={supervisors} />
        </CardContent>
      </Card>

      {/* 반 목록 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">暂无班级</CardContent>
          </Card>
        ) : (
          classrooms.map((c: any) => {
            const spName = supervisors.find((s) => s.id === c.supervisor_id)?.name
            return (
              <Card key={c.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    监督者：{spName ? <Badge variant="outline">{spName}</Badge> : <Badge variant="secondary">未指定</Badge>}
                  </div>
                  <div className="flex justify-between">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/classrooms/${c.id}/manage`}>管理</Link>
                    </Button>
                    <Button asChild size="sm" variant="default">
                      <Link href={`/admin/classrooms/${c.id}/manage`}>学生分配</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
