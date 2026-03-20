// app/admin/progress/page.tsx
export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { adminSupabase } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Download, ArrowLeft, Users, BookOpen, TrendingUp, Search
} from "lucide-react"
import ProgressAccordion from "@/components/progress-accordion"

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

const ALL = "__all__"

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    category?: string
    classroom?: string
    completed?: "all" | "yes" | "no"
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
  } = await searchParams

  const q = (rawQ || "").trim()
  const rawCategory = rawCategoryParam || ALL
  const rawClassroom = rawClassroomParam || ALL
  const category = rawCategory === ALL ? "" : rawCategory
  const classroom = rawClassroom === ALL ? "" : rawClassroom
  const completed = (rawCompleted as "all" | "yes" | "no") || "all"

  const [catRes, classRes] = await Promise.all([
    adminSupabase.from("categories").select("id, name").order("name"),
    adminSupabase.from("classrooms").select("id, name").order("name"),
  ])
  const categories = catRes.data ?? []
  const classrooms = classRes.data ?? []

  // 전체 데이터 조회 (페이지네이션 없이 전부)
  let query = adminSupabase.from("v_progress_admin").select("*")

  if (q) query = query.or(`student_name.ilike.%${q}%,student_email.ilike.%${q}%,video_title.ilike.%${q}%`)
  if (category) query = query.eq("category_id", category)
  if (completed === "yes") query = query.eq("completed", true)
  if (completed === "no") query = query.eq("completed", false)
  if (classroom) {
    const cname = classrooms.find((c: any) => c.id === classroom)?.name || ""
    if (cname) query = query.ilike("classrooms", `%${cname}%`)
  }

  query = query.order("last_watched_at", { ascending: false, nullsFirst: false })

  const { data, error } = await query
  const loadError = error ? (error.message ?? "Unknown error") : null
  const rows: Row[] = Array.isArray(data) ? (data as any) : []

  // 학생별로 그룹핑 (progress-accordion 형식에 맞게)
  const studentMap = new Map<string, {
    student_id: string
    student_name: string
    student_email: string
    classroom_name: string
    videos: {
      video_id: string
      video_title: string
      category_name: string | null
      duration: number | null
      watched: number | null
      percent_viewed: number | null
      completed: boolean
      last_watched_at: string | null
    }[]
  }>()

  for (const row of rows) {
    if (!studentMap.has(row.student_id)) {
      studentMap.set(row.student_id, {
        student_id: row.student_id,
        student_name: row.student_name,
        student_email: row.student_email,
        classroom_name: row.classrooms?.split("\n")[0] ?? "-",
        videos: [],
      })
    }
    studentMap.get(row.student_id)!.videos.push({
      video_id: row.video_id,
      video_title: row.video_title,
      category_name: row.category_name,
      duration: row.video_duration,
      watched: row.watched_duration,
      percent_viewed: row.percent_viewed,
      completed: row.completed,
      last_watched_at: row.last_watched_at,
    })
  }

  const students = Array.from(studentMap.values())

  // 통계
  const totalStudents = students.length
  const totalVideos = new Set(rows.map(r => r.video_id)).size
  const completedCount = rows.filter(r => r.completed).length
  const completionRate = rows.length > 0 ? Math.round((completedCount / rows.length) * 100) : 0

  const exportQuery = new URLSearchParams({
    q, category: category || ALL, classroom: classroom || ALL, completed,
  }).toString()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              全体学习进度
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              按学生查看观看进度，支持筛选与导出
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
              <p className="text-xs text-muted-foreground">视频总数</p>
              <p className="text-2xl font-bold">{totalVideos}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">整体完成率</p>
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

        {/* 학생별 아코디언 */}
        {students.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground text-sm">
              暂无数据
            </CardContent>
          </Card>
        ) : (
          <ProgressAccordion students={students} />
        )}

        {students.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            共 {students.length} 名学生 · {rows.length} 条记录
          </p>
        )}

      </div>
    </div>
  )
}