// app/announcements/page.tsx
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnnouncementList } from "@/components/admin/announcement-list"
import MarkReadClient from "@/components/announcement-mark-read"
import { Megaphone, School, Users, Bell } from "lucide-react"

type Raw = Record<string, any>
type Norm = {
  id: string
  title: string | null
  content: string | null
  audience: string | null
  author_id: string | null
  author: string | null
  created_at: string | null
  classroom_id?: string | null
}

const isUUID = (v: unknown) => typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v)

function normalize(a: Raw): Norm {
  const authorId =
    (isUUID(a.author_id) && a.author_id) ||
    (isUUID(a.author) && a.author) ||
    (isUUID(a.created_by) && a.created_by) ||
    (isUUID(a.sender) && a.sender) ||
    null

  const authorName =
    (typeof a.author === "string" && !isUUID(a.author) && a.author) ||
    (typeof a.created_by === "string" && !isUUID(a.created_by) && a.created_by) ||
    (typeof a.sender === "string" && !isUUID(a.sender) && a.sender) ||
    null

  return {
    id: a.id,
    title: a.title ?? null,
    content: a.body ?? a.content ?? a.message ?? a.text ?? null,
    audience: a.audience ?? a.target ?? a.scope ?? null,
    author_id: authorId,
    author: authorName,
    created_at: a.created_at ?? a.inserted_at ?? a.createdAt ?? null,
    classroom_id: Object.prototype.hasOwnProperty.call(a, "classroom_id") ? a.classroom_id : null,
  }
}

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: me } = await supabase.from("profiles").select("id,role,name").eq("id", user.id).single()
  if (!me) redirect("/auth/login")

  const mapAuthors = async (list: Norm[]) => {
    const admin = createAdminClient()
    const ids = Array.from(new Set(list.map((x) => x.author_id).filter((v): v is string => !!v)))
    if (ids.length === 0) return list

    const { data: profs, error } = await admin
      .from("profiles")
      .select("id,name,email")
      .in("id", ids)

    if (!error && profs) {
      const idToName = new Map<string, string>(
        profs.map((p) => [p.id as string, (p.name as string) || (p.email as string) || "用户"])
      )
      return list.map((x) => ({
        ...x,
        author: x.author ?? (x.author_id ? idToName.get(x.author_id) ?? x.author_id : "系统管理员"),
      }))
    }
    return list
  }

  // ─── 학생 ───
  if (me.role === "student") {
    const { data: myClasses } = await supabase
      .from("classroom_students")
      .select("classroom_id")
      .eq("student_id", me.id)

    const myClassIds = (myClasses ?? []).map((r) => r.classroom_id)

    let classAnnIds: string[] = []
    if (myClassIds.length > 0) {
      const { data: links } = await supabase
        .from("announcement_classrooms")
        .select("ann_id")
        .in("classroom_id", myClassIds)
      classAnnIds = (links ?? []).map((r) => r.ann_id)
    }

    const { data: globalRaw = [] } = await supabase
      .from("announcements")
      .select("*")
      .in("audience", ["students", "both"])
      .order("created_at", { ascending: false })

    let classRaw: Raw[] = []
    if (classAnnIds.length > 0) {
      const { data = [] } = await supabase
        .from("announcements")
        .select("*")
        .eq("audience", "classrooms")
        .in("id", classAnnIds)
        .order("created_at", { ascending: false })
      classRaw = data
    }

    const globalList = await mapAuthors(globalRaw.map(normalize))
    const classList = await mapAuthors(classRaw.map(normalize))
    const markIds = [...new Set([...globalList, ...classList].map((a) => a.id))]
    const totalCount = globalList.length + classList.length

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* 헤더 */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              公告
            </h1>
            <p className="text-sm text-muted-foreground mt-1">查看系统公告与班级公告</p>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">公告总数</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">全体公告</p>
                <p className="text-2xl font-bold">{globalList.length}</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <School className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">班级公告</p>
                <p className="text-2xl font-bold">{classList.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 전체 공지 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  全体公告
                  <Badge variant="secondary" className="ml-auto text-xs">{globalList.length}</Badge>
                </CardTitle>
                <CardDescription>面向学生或全部用户</CardDescription>
              </CardHeader>
              <CardContent>
                {globalList.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">暂无公告</div>
                ) : (
                  <AnnouncementList items={globalList as any} />
                )}
              </CardContent>
            </Card>

            {/* 반 공지 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <School className="w-4 h-4 text-purple-500" />
                  班级公告
                  <Badge variant="secondary" className="ml-auto text-xs">{classList.length}</Badge>
                </CardTitle>
                <CardDescription>仅显示你所在班级的公告</CardDescription>
              </CardHeader>
              <CardContent>
                {classList.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">暂无公告</div>
                ) : (
                  <AnnouncementList items={classList as any} />
                )}
              </CardContent>
            </Card>
          </div>

          <MarkReadClient ids={markIds} />
        </div>
      </div>
    )
  }

  // ─── supervisor / admin / owner ───
  const audiences =
    me.role === "supervisor"
      ? ["supervisors", "both"]
      : ["supervisors", "students", "both", "classrooms"]

  const { data: raw = [] } = await supabase
    .from("announcements")
    .select("*")
    .in("audience", audiences)
    .order("created_at", { ascending: false })

  const list = await mapAuthors(raw.map(normalize))

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            公告
          </h1>
          <p className="text-sm text-muted-foreground mt-1">查看与你角色相关的公告</p>
        </div>

        {/* 통계 */}
        <div className="rounded-xl border bg-card p-5 flex items-center gap-4 w-fit">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">公告总数</p>
            <p className="text-2xl font-bold">{list.length}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">全部公告</CardTitle>
              <Badge variant="secondary" className="text-xs">{list.length} 条</Badge>
            </div>
            <CardDescription>共 {list.length} 条与你角色相关的公告</CardDescription>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">暂无公告</div>
            ) : (
              <AnnouncementList items={list as any} />
            )}
          </CardContent>
        </Card>

        <MarkReadClient ids={list.map((a) => a.id)} />
      </div>
    </div>
  )
}