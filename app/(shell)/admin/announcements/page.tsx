// app/(shell)/admin/announcements/page.tsx
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import AnnouncementForm from "@/components/announcement-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnnouncementList } from "@/components/admin/announcement-list"
import { Megaphone, PlusCircle, Clock, Users, BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

type RawAnn = Record<string, any>
type NormAnn = {
  id: string
  title: string | null
  content: string | null
  audience: string | null
  author_id: string | null
  author: string | null
  created_at: string | null
  classroom_id: string | null
}

const isUUID = (v: unknown) =>
  typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v)

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: me } = await supabase
    .from("profiles")
    .select("role,name")
    .eq("id", user.id)
    .single()

  if (!me || !["owner", "administrator"].includes(me.role)) {
    redirect("/dashboard")
  }

  const { data: raw, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[announcements] select error:", JSON.stringify(error, null, 2))
  }

  const normalized0: NormAnn[] = (raw ?? []).map((a: RawAnn) => {
    const rawAuthorId =
      (isUUID(a.author_id) && a.author_id) ||
      (isUUID(a.author) && a.author) ||
      (isUUID(a.created_by) && a.created_by) ||
      (isUUID(a.sender) && a.sender) ||
      null

    const rawAuthorName =
      (typeof a.author === "string" && !isUUID(a.author) && a.author) ||
      (typeof a.created_by === "string" && !isUUID(a.created_by) && a.created_by) ||
      (typeof a.sender === "string" && !isUUID(a.sender) && a.sender) ||
      null

    return {
      id: a.id,
      title: a.title ?? null,
      content: a.content ?? a.body ?? a.message ?? a.text ?? null,
      audience: a.audience ?? a.target ?? a.scope ?? null,
      author_id: rawAuthorId,
      author: rawAuthorName,
      created_at: a.created_at ?? a.inserted_at ?? a.createdAt ?? null,
      classroom_id: Object.prototype.hasOwnProperty.call(a, "classroom_id") ? a.classroom_id : null,
    }
  })

  const authorIds = Array.from(
    new Set(normalized0.map((a) => a.author_id).filter((v): v is string => Boolean(v)))
  )

  let idToName = new Map<string, string>()
  if (authorIds.length > 0) {
    const admin = createAdminClient()
    const { data: profs } = await admin
      .from("profiles")
      .select("id,name,email")
      .in("id", authorIds)

    idToName = new Map(
      (profs ?? []).map((p) => [p.id as string, (p.name as string) || (p.email as string) || "用户"])
    )
  }

  const normalized: NormAnn[] = normalized0.map((a) => ({
    ...a,
    author: a.author ?? (a.author_id ? idToName.get(a.author_id) ?? a.author_id : "系统管理员"),
  }))

  const recent = normalized.filter((a) => (me.role === "owner" ? a.classroom_id == null : true))

  // 통계
  const totalCount = recent.length
  const audienceSet = new Set(recent.map(a => a.audience).filter(Boolean))

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            公告管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            创建系统公告并查看历史公告
            {me.role === "owner" && "（所有者不包含班级公告）"}
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-primary" />
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
              <p className="text-xs text-muted-foreground">受众类型</p>
              <p className="text-2xl font-bold">{audienceSet.size}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">最近公告</p>
              <p className="text-sm font-medium mt-0.5 truncate">
                {recent[0]?.created_at
                  ? new Date(recent[0].created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
                  : "暂无"}
              </p>
            </div>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            加载公告失败：{error.message || "Unknown error"}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌: 새 공지 발행 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                发布新公告
              </CardTitle>
              <CardDescription>选择受众并立即发送</CardDescription>
            </CardHeader>
            <CardContent>
              <AnnouncementForm />
            </CardContent>
          </Card>

          {/* 우: 최근 공지 목록 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    最近公告
                  </CardTitle>
                  <CardDescription className="mt-1">共 {recent.length} 条</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  最近 50 条
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AnnouncementList
                items={recent.map(({ author_id, ...rest }) => rest) as any}
                fallbackError={!!error}
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}