// app/supervisor/progress/page.tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: myClasses } = await supabase
    .from("classrooms")
    .select("id,name")
    .eq("supervisor_id", user.id)
    .order("name")

  const { data: categories } = await supabase.from("categories").select("id,name").order("name")

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
    classroom_id,
    search,
    category_id,
    completed,
  })

  // CSV 링크(현재 필터 유지)
  const csvParams = new URLSearchParams()
  if (classroom_id && classroom_id !== "all") csvParams.set("classroom_id", classroom_id)
  if (search) csvParams.set("search", search)
  if (category_id && category_id !== "all") csvParams.set("category_id", category_id)
  if (completed) csvParams.set("completed", completed)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">小组学习进度</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">返回仪表板</Link>
          </Button>
          <Button asChild>
            <Link href={`/api/supervisor/progress/export?${csvParams.toString()}`}>导出 CSV</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="text-destructive py-4">加载失败：{error}</CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {/* 班级 */}
          <form method="get" className="flex items-center gap-2">
            {/* 기존 파라미터 유지용 히든 */}
            <input type="hidden" name="search" value={search} />
            <input type="hidden" name="category_id" value={category_id} />
            <input type="hidden" name="completed" value={completed} />

            <Select defaultValue={classroom_id} name="classroom_id">
              <SelectTrigger className="w-56">
                <SelectValue placeholder="选择班级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {classes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">应用</Button>
          </form>

          {/* 分类 */}
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="search" value={search} />
            <input type="hidden" name="classroom_id" value={classroom_id} />
            <input type="hidden" name="completed" value={completed} />

            <Select defaultValue={category_id} name="category_id">
              <SelectTrigger className="w-56">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">应用</Button>
          </form>

          {/* 完成状态 */}
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="search" value={search} />
            <input type="hidden" name="classroom_id" value={classroom_id} />
            <input type="hidden" name="category_id" value={category_id} />

            <Select defaultValue={completed} name="completed">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="完成状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="done">已完成</SelectItem>
                <SelectItem value="not">未完成</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">应用</Button>
          </form>

          {/* 搜索 */}
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="classroom_id" value={classroom_id} />
            <input type="hidden" name="category_id" value={category_id} />
            <input type="hidden" name="completed" value={completed} />

            <Input name="search" defaultValue={search} placeholder="姓名 / 邮箱 / 视频标题" className="w-64" />
            <Button type="submit">搜索</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">班级</th>
                  <th className="px-4 py-2 text-left">学生</th>
                  <th className="px-4 py-2 text-left">视频</th>
                  <th className="px-4 py-2 text-left">分类</th>
                  <th className="px-4 py-2 text-right">观看/总时长</th>
                  <th className="px-4 py-2 text-right">% 完成</th>
                  <th className="px-4 py-2 text-center">状态</th>
                  <th className="px-4 py-2 text-left">最后观看</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={8}>
                      暂无数据
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={`${r.classroom_id}-${r.student_id}-${r.video_id}`} className="border-b last:border-0">
                    <td className="px-4 py-2">{r.classroom_name}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.student_name}</div>
                      <div className="text-muted-foreground">{r.student_email}</div>
                    </td>
                    <td className="px-4 py-2">{r.video_title}</td>
                    <td className="px-4 py-2">{r.category_name || "-"}</td>
                    <td className="px-4 py-2 text-right">
                      {fmtTime(r.watched)} / {fmtTime(r.duration)}
                    </td>
                    <td className="px-4 py-2 text-right">{r.percent_viewed ?? 0}%</td>
                    <td className="px-4 py-2 text-center">{r.completed ? "已完成" : "未完成"}</td>
                    <td className="px-4 py-2">{r.last_watched_at ? new Date(r.last_watched_at).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function fmtTime(sec?: number | null) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}
