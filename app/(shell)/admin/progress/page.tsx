// app/admin/progress/page.tsx
export const dynamic = "force-dynamic"

import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { adminSupabase } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Download, ArrowLeft, Users, BookOpen, TrendingUp,
  CheckCircle2, Clock, Search
} from "lucide-react"

type Row = {
  student_id: string
  student_name: string
  student_email: string
  classrooms: string | null
  video_id: string
  video_title: string
  video_duration: number | null
  category_id: string | null
  category_name: string | null
  watched_duration: number
  percent_viewed: number
  completed: boolean
  last_watched_at: string | null
}

const PAGE_SIZE = 20
const ALL = "__all__"

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    category?: string
    classroom?: string
    completed?: "all" | "yes" | "no"
    page?: string
  }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || !["owner", "administrator"].includes(me.role)) redirect("/dashboard")

  // ✅ Next.js 15/16: await로 unwrap
  const {
    q: rawQ,
    category: rawCategoryParam,
    classroom: rawClassroomParam,
    completed: rawCompleted,
    page: rawPage,
  } = await searchParams

  const q = (rawQ || "").trim()
  const rawCategory = rawCategoryParam || ALL
  const rawClassroom = rawClassroomParam || ALL
  const category = rawCategory === ALL ? "" : rawCategory
  const classroom = rawClassroom === ALL ? "" : rawClassroom
  const completed = (rawCompleted as "all" | "yes" | "no") || "all"
  const page = Math.max(1, parseInt(rawPage || "1", 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [catRes, classRes] = await Promise.all([
    adminSupabase.from("categories").select("id, name").order("name"),
    adminSupabase.from("classrooms").select("id, name").order("name"),
  ])
  const categories = catRes.data ?? []
  const classrooms = classRes.data ?? []

  let query = adminSupabase.from("v_progress_admin").select("*", { count: "exact" })
  if (q) query = query.or(`student_name.ilike.%${q}%,student_email.ilike.%${q}%,video_title.ilike.%${q}%`)
  if (category) query = query.eq("category_id", category)
  if (completed === "yes") query = query.eq("completed", true)
  if (completed === "no") query = query.eq("completed", false)
  if (classroom) {
    const cname = classrooms.find((c: any) => c.id === classroom)?.name || ""
    if (cname) query = query.ilike("classrooms", `%${cname}%`)
  }
  query = query.order("last_watched_at", { ascending: false, nullsFirst: false }).range(from, to)

  const { data, error, count } = await query
  const loadError = error ? (error.message ?? "Unknown error") : null
  const rows: Row[] = Array.isArray(data) ? (data as any) : []
  const total = typeof count === "number" ? count : rows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 통계
  const completedCount = rows.filter(r => r.completed).length
  const totalStudents = new Set(rows.map(r => r.student_id)).size
  const completionRate = rows.length > 0 ? Math.round((completedCount / rows.length) * 100) : 0

  const exportQuery = new URLSearchParams({
    q, category: category || ALL, classroom: classroom || ALL, completed,
  }).toString()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              全体学习进度
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              按学生/视频查看观看进度，支持筛选与导出
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回仪表板
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/api/admin/progress/export?${exportQuery}`}>
                <Download className="w-4 h-4 mr-1" />
                导出 CSV
              </Link>
            </Button>
          </div>
        </div>

        {/* 에러 */}
        {loadError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p>加载失败：{loadError}</p>
            <p className="text-xs mt-1 text-muted-foreground">
              若首次配置，请先执行创建视图脚本：<code>public.v_progress_admin</code>
            </p>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">学生总数</p>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">记录总数</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">完成率（当页）</p>
              <p className="text-2xl font-bold">{completionRate}%</p>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">

              <form action="/admin/progress" method="get" className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">搜索</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input name="q" placeholder="姓名 / 邮箱 / 视频标题" defaultValue={q} className="pl-8 w-52" />
                  </div>
                  <Button type="submit" variant="secondary" size="sm">应用</Button>
                </div>
              </form>

              <form action="/admin/progress" method="get" className="flex flex-col gap-1">
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="classroom" value={rawClassroom} />
                <input type="hidden" name="completed" value={completed} />
                <label className="text-xs font-medium text-muted-foreground">分类</label>
                <div className="flex gap-2">
                  <Select name="category" defaultValue={category || ALL}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="全部分类" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>全部分类</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" variant="secondary" size="sm">应用</Button>
                </div>
              </form>

              <form action="/admin/progress" method="get" className="flex flex-col gap-1">
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="category" value={rawCategory} />
                <input type="hidden" name="completed" value={completed} />
                <label className="text-xs font-medium text-muted-foreground">班级</label>
                <div className="flex gap-2">
                  <Select name="classroom" defaultValue={classroom || ALL}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="全部班级" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>全部班级</SelectItem>
                      {classrooms.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" variant="secondary" size="sm">应用</Button>
                </div>
              </form>

              <form action="/admin/progress" method="get" className="flex flex-col gap-1">
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="category" value={rawCategory} />
                <input type="hidden" name="classroom" value={rawClassroom} />
                <label className="text-xs font-medium text-muted-foreground">完成状态</label>
                <div className="flex gap-2">
                  <Select name="completed" defaultValue={completed}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="全部" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="yes">已完成</SelectItem>
                      <SelectItem value="no">未完成</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" variant="secondary" size="sm">应用</Button>
                </div>
              </form>

            </div>
          </CardContent>
        </Card>

        {/* 테이블 */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <p className="text-sm font-medium">
              结果
              <span className="ml-2 text-muted-foreground font-normal">({total})</span>
            </p>
            <p className="text-xs text-muted-foreground">
              第 {total === 0 ? 0 : from + 1}–{Math.min(to + 1, total)} 条，共 {total} 条
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">学生</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">班级</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">视频</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">分类</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-44">进度</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">状态</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">最后观看</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 && !loadError ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const pct = Math.min(100, r.percent_viewed ?? 0)
                    return (
                      <tr key={`${r.student_id}-${r.video_id}`} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-medium">{r.student_name}</div>
                          <div className="text-xs text-muted-foreground">{r.student_email}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground whitespace-pre-line">
                          {r.classrooms || "-"}
                        </td>
                        <td className="px-5 py-4 max-w-[180px]">
                          <span className="line-clamp-2 text-sm">{r.video_title}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-muted-foreground">{r.category_name || "-"}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{fmt(r.watched_duration)} / {fmt(r.video_duration ?? 0)}</span>
                              <span className="font-medium text-foreground">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  r.completed ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-orange-400"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {r.completed ? (
                            <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200 gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              已完成
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Clock className="w-3 h-3" />
                              进行中
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {r.last_watched_at
                            ? new Date(r.last_watched_at).toLocaleDateString("zh-CN", {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">第 {page} / {totalPages} 页</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                  <Link href={`/admin/progress?${qs({ q, category: category || ALL, classroom: classroom || ALL, completed, page: String(page - 1) })}`}>
                    上一页
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
                  <Link href={`/admin/progress?${qs({ q, category: category || ALL, classroom: classroom || ALL, completed, page: String(page + 1) })}`}>
                    下一页
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function qs(obj: Record<string, string>) {
  return new URLSearchParams(obj).toString()
}