// app/supervisor/announcements/page.tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AnnouncementFormSupervisorSimple from "@/components/announcement-form-supervisor"

export default async function SupervisorAnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || me.role !== "supervisor") redirect("/dashboard")

  const { data: recent = [] } = await supabase
    .from("announcements")
    .select("id, title, created_at")
    .eq("created_by", user.id)
    .eq("audience", "classrooms")
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>向我管理的所有班级发送公告</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 제목/내용만 입력 → RPC로 내 모든 반에 자동 배포 */}
          <AnnouncementFormSupervisorSimple />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>我发送的最近公告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.map((a) => (
            <div key={a.id} className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString()}
              </div>
              <div className="font-semibold">{a.title}</div>
            </div>
          ))}
          {recent.length === 0 && <div className="text-muted-foreground">暂无公告</div>}
        </CardContent>
      </Card>
    </div>
  )
}
