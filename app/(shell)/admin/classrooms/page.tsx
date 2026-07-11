// app/admin/classrooms/page.tsx
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ClassroomCreateForm from "@/components/classrooms/classroom-create-form"
import { DeleteClassroomButton } from "@/components/classrooms/delete-classroom-button"
import { School, Users, UserCog, PlusCircle, Settings } from "lucide-react"

export default async function ClassroomsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profileErr || !profile || !["owner", "administrator"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { data: supervisorsData, error: supervisorsErr } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "supervisor")
    .order("name")

  const supervisors = supervisorsData ?? []

  const { data: classroomsData, error: classroomsErr } = await supabase
    .from("classrooms")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })

  const classrooms = classroomsData ?? []

  // 반-supervisor 매핑 조회
  const { data: csRows } = await supabase
    .from("classroom_supervisors")
    .select("classroom_id, supervisor_id")

  const supervisorMap = new Map<string, string[]>()
  csRows?.forEach((r) => {
    const list = supervisorMap.get(r.classroom_id) ?? []
    list.push(r.supervisor_id)
    supervisorMap.set(r.classroom_id, list)
  })

  // 학생 수 조회
  const { data: studentCounts } = await supabase
    .from("classroom_students")
    .select("classroom_id")

  const countMap = new Map<string, number>()
  studentCounts?.forEach(s => {
    countMap.set(s.classroom_id, (countMap.get(s.classroom_id) ?? 0) + 1)
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <School className="w-6 h-6 text-primary" />
              班级管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">创建和管理学习小组</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">返回仪表板</Link>
          </Button>
        </div>

        {/* 에러 */}
        {(supervisorsErr || classroomsErr) && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {supervisorsErr && <div>supervisors 错误: {supervisorsErr.message}</div>}
            {classroomsErr && <div>classrooms 错误: {classroomsErr.message}</div>}
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <School className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">班级总数</p>
              <p className="text-2xl font-bold">{classrooms.length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">学生总数</p>
              <p className="text-2xl font-bold">
                {Array.from(countMap.values()).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <UserCog className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">班主任总数</p>
              <p className="text-2xl font-bold">{supervisors.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌: 새 반 만들기 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  创建新班级
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClassroomCreateForm supervisors={supervisors} />
              </CardContent>
            </Card>
          </div>

          {/* 우: 반 목록 */}
          <div className="lg:col-span-2">
            {classrooms.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground text-sm">
                  暂无班级，请先创建班级
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {classrooms.map((c: any) => {
                  const classroomSupervisorIds = supervisorMap.get(c.id) ?? []
                  const classroomSupervisors = supervisors.filter((s) =>
                    classroomSupervisorIds.includes(s.id)
                  )
                  const studentCount = countMap.get(c.id) ?? 0

                  return (
                    <Card key={c.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          {/* 아이콘 */}
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <School className="w-5 h-5 text-primary" />
                          </div>

                          {/* 반 정보 */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{c.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {classroomSupervisors.length > 0 ? (
                                classroomSupervisors.map((s) => (
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
                                {studentCount} 名学生
                              </Badge>
                            </div>
                          </div>

                          {/* 액션 버튼 */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Button asChild size="sm" variant="outline" className="gap-1.5 h-8">
                              <Link href={`/admin/classrooms/${c.id}/manage`}>
                                <Settings className="w-3.5 h-3.5" />
                                管理
                              </Link>
                            </Button>
                            <Button asChild size="sm" className="gap-1.5 h-8">
                              <Link href={`/admin/classrooms/${c.id}/manage`}>
                                <Users className="w-3.5 h-3.5" />
                                学生分配
                              </Link>
                            </Button>
                            <DeleteClassroomButton
                              classroomId={c.id}
                              classroomName={c.name}
                              studentCount={studentCount}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}