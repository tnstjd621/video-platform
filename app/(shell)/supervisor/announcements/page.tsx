// app/supervisor/announcements/page.tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AnnouncementFormSupervisorSimple from "@/components/announcement-form-supervisor"
import AnnouncementDeleteButton from "@/components/announcement-delete-button"

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
          <CardTitle>向我管理的班级发送公告</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementFormSupervisorSimple />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>我发送的最近公告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.map((a) => (
            <div key={a.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </div>
                <div className="font-semibold">{a.title}</div>
              </div>
              <AnnouncementDeleteButton announcementId={a.id} />
            </div>
          ))}
          {recent.length === 0 && <div className="text-muted-foreground">暂无公告</div>}
        </CardContent>
      </Card>
    </div>
  )
}