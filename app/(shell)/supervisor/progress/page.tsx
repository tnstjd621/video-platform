// app/supervisor/progress/page.tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Download, ArrowLeft, Users, BookOpen, TrendingUp } from "lucide-react"
import ProgressAccordion from "@/components/progress-accordion"

export const dynamic = "force-dynamic"

type Row = {
  classroom_id: string
  classroom_name: string
  student_id: string
  student_name: string
  student_email: string
  video_id: string
  video_title: string
  category_id: string | null
  category_name: string | null
  duration: number | null
  watched: number | null
  percent_viewed: number | null
  completed: boolean
  last_watched_at: string | null
}

async function getData(params: {
  classroom_id?: string
  search?: string
  category_id?: string
  completed?: "all" | "done" | "not"
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: myClasses } = await supabase
    .from("classrooms").select("id,name")
    .eq("supervisor_id", user.id).order("name")

  const { data: categories } = await supabase
    .from("categories").select("id,name").order("name")

  const { data: rows, error } = await supabase.rpc("progress_for_supervisor", {
    p_classroom_id: params.classroom_id && params.classroom_id !== "all" ? params.classroom_id : null,
    p_search: params.search || null,
    p_category_id: params.category_id && params.category_id !== "all" ? params.category_id : null,
    p_completed: params.completed || "all",
  })

  return {
    rows: (rows as Row[]) || [],
    classes: myClasses || [],
    categories: categories || [],
    error: error?.message || null,
  }
}

export default async function SupervisorProgressPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const classroom_id = (searchParams.classroom_id as string) || "all"
  const search = (searchParams.search as string) || ""
  const category_id = (searchParams.category_id as string) || "all"
  const completed = ((searchParams.completed as string) || "all") as "all" | "done" | "not"

  const { rows, classes, categories, error } = await getData({
    classroom_id, search, category_id, completed,
  })

  // 학생별로 그룹핑
  const studentMap = new Map<string, {
    student_id: string
    student_name: string
    student_email: string
    classroom_name: string
    videos: Row[]
  }>()

  for (const row of rows) {
    if (!studentMap.has(row.student_id)) {
      studentMap.set(row.student_id, {
        student_id: row.student_id,
        student_name: row.student_name,
        student_email: row.student_email,
        classroom_name: row.classroom_name,
        videos: [],
      })
    }
    studentMap.get(row.student_id)!.videos.push(row)
  }

  const students = Array.from(studentMap.values())

  // 통계
  const totalStudents = students.length
  const totalVideos = new Set(rows.map((r) => r.video_id)).size
  const completedCount = rows.filter((r) => r.completed).length
  const completionRate = rows.length > 0
    ? Math.round((completedCount / rows.length) * 100) : 0

  const csvParams = new URLSearchParams()
  if (classroom_id !== "all") csvParams.set("classroom_id", classroom_id)
  if (search) csvParams.set("search", search)
  if (category_id !== "all") csvParams.set("category_id", category_id)
  if (completed !== "all") csvParams.set("completed", completed)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">学习进度总览</h1>
            <p className="text-sm text-muted-foreground mt-1">实时追踪学生的课程学习情况</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" />返回仪表板
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/api/supervisor/progress/export?${csvParams.toString()}`}>
                <Download className="w-4 h-4 mr-1" />导出 CSV
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            加载失败：{error}
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">学生总数</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">视频总数</p>
                <p className="text-2xl font-bold">{totalVideos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">整体完成率</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <form method="get" className="flex flex-col gap-1">
                <input type="hidden" name="search" value={search} />
                <input type="hidden" name="category_id" value={category_id} />
                <input type="hidden" name="completed" value={completed} />
                <label className="text-xs font-medium text-muted-foreground">班级</label>
                <div className="flex gap-2">
                  <Select defaultValue={classroom_id} name="classroom_id">
                    <SelectTrigger className="w-44"><SelectValue placeholder="选择班级" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部班级</SelectItem>
                      {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="submit" variant="secondary" size="sm">应用</Button>
                </div>
              </form>

              <form method="get" className="flex flex-col gap-1">
                <input type="hidden" name="search" value={search} />
                <input type="hidden" name="classroom_id" value={classroom_id} />
                <input type="hidden" name="completed" value={completed} />
                <label className="text-xs font-medium text-muted-foreground">分类</label>
                <div className="flex gap-2">
                  <Select defaultValue={category_id} name="category_id">
                    <SelectTrigger className="w-44"><SelectValue placeholder="选择分类" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部分类</SelectItem>
                      {categories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="submit" variant="secondary" size="sm">应用</Button>
                </div>
              </form>

              <form method="get" className="flex flex-col gap-1">
                <input type="hidden" name="search" value={search} />
                <input type="hidden" name="classroom_id" value={classroom_id} />
                <input type="hidden" name="category_id" value={category_id} />
                <label className="text-xs font-medium text-muted-foreground">完成状态</label>
                <div className="flex gap-2">
                  <Select defaultValue={completed} name="completed">
                    <SelectTrigger className="w-36"><SelectValue placeholder="完成状态" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="done">已完成</SelectItem>
                      <SelectItem value="not">未完成</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" variant="secondary" size="sm">应用</Button>
                </div>
              </form>

              <form method="get" className="flex flex-col gap-1">
                <input type="hidden" name="classroom_id" value={classroom_id} />
                <input type="hidden" name="category_id" value={category_id} />
                <input type="hidden" name="completed" value={completed} />
                <label className="text-xs font-medium text-muted-foreground">搜索</label>
                <div className="flex gap-2">
                  <Input name="search" defaultValue={search} placeholder="姓名 / 邮箱 / 视频标题" className="w-56" />
                  <Button type="submit" variant="secondary" size="sm">搜索</Button>
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