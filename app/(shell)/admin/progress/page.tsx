// app/admin/progress/page.tsx
export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { adminSupabase } from "@/lib/supabase/admin"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
const ALL = "__all__" // ← 빈 문자열 대신 사용할 센티널

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: {
    q?: string
    category?: string
    classroom?: string
    completed?: "all" | "yes" | "no"
    page?: string
  }
}) {
  const supabase = await createClient()

  // 로그인 & 권한
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || !["owner", "administrator"].includes(me.role)) redirect("/dashboard")

  // 필터 값 (문자열로 정리)
  const q = (searchParams.q || "").trim()

  // ⬇️ "__all__" → "" 로 변환
  const rawCategory = searchParams.category || ALL
  const rawClassroom = searchParams.classroom || ALL
  const category = rawCategory === ALL ? "" : rawCategory
  const classroom = rawClassroom === ALL ? "" : rawClassroom

  const completed = (searchParams.completed as "all" | "yes" | "no") || "all"
  const page = Math.max(1, parseInt(searchParams.page || "1", 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // 필터 드롭다운 소스
  const [catRes, classRes] = await Promise.all([
    adminSupabase.from("categories").select("id, name").order("name"),
    adminSupabase.from("classrooms").select("id, name").order("name"),
  ])
  const categories = catRes.data ?? []
  const classrooms = classRes.data ?? []

  // 데이터 쿼리
  let query = adminSupabase.from("v_progress_admin").select("*", { count: "exact" })

  if (q) {
    query = query.or(
      `student_name.ilike.%${q}%,student_email.ilike.%${q}%,video_title.ilike.%${q}%`
    )
  }
  if (category) query = query.eq("category_id", category)
  if (completed === "yes") query = query.eq("completed", true)
  if (completed === "no") query = query.eq("completed", false)
  if (classroom) {
    const cname = classrooms.find((c: any) => c.id === classroom)?.name || ""
    if (cname) query = query.ilike("classrooms", `%${cname}%`)
  }

  query = query.order("last_watched_at", { ascending: false, nullsFirst: false }).range(from, to)

  // 결과 가드 처리
  const { data, error, count } = await query
  const loadError = error ? (error.message ?? "Unknown error") : null
  const rows: Row[] = Array.isArray(data) ? (data as any) : []
  const total = typeof count === "number" ? count : rows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // CSV 쿼리스트링 (센티널 사용)
  const exportQuery = new URLSearchParams({
    q,
    category: category || ALL,
    classroom: classroom || ALL,
    completed,
  }).toString()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">全体学习进度</h1>
          <p className="text-muted-foreground">按学生/视频查看观看进度，支持筛选与导出</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">返回仪表板</Link>
          </Button>
          <Button asChild variant="default">
            <Link href={`/api/admin/progress/export?${exportQuery}`}>导出 CSV</Link>
          </Button>
        </div>
      </div>

      {/* 로딩/쿼리 에러 배너 */}
      {loadError && (
        <Card className="mb-4 border-red-500">
          <CardContent className="text-red-600 py-3">
            加载失败：{loadError}
            <div className="text-xs text-muted-foreground mt-1">
              若首次配置，请先执行创建视图脚本：<code>public.v_progress_admin</code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 筛选 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          {/* 검색 */}
          <div>
            <Label htmlFor="q">搜索</Label>
            <form className="flex gap-2" action="/admin/progress" method="get">
              <Input id="q" name="q" placeholder="姓名 / 邮箱 / 视频标题" defaultValue={q} />
              <Button type="submit" variant="secondary">
                应用
              </Button>
            </form>
          </div>

          {/* 分类 */}
          <div>
            <Label>分类</Label>
            <form action="/admin/progress" method="get" className="flex">
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="classroom" value={rawClassroom} />
              <input type="hidden" name="completed" value={completed} />
              <Select name="category" defaultValue={category ? category : ALL}>
                <SelectTrigger>
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>全部</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary" className="ml-2">
                应用
              </Button>
            </form>
          </div>

          {/* 班级 */}
          <div>
            <Label>班级</Label>
            <form action="/admin/progress" method="get" className="flex">
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="category" value={rawCategory} />
              <input type="hidden" name="completed" value={completed} />
              <Select name="classroom" defaultValue={classroom ? classroom : ALL}>
                <SelectTrigger>
                  <SelectValue placeholder="全部班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>全部</SelectItem>
                  {classrooms.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary" className="ml-2">
                应用
              </Button>
            </form>
          </div>

          {/* 完成状态 */}
          <div>
            <Label>完成状态</Label>
            <form action="/admin/progress" method="get" className="flex">
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="category" value={rawCategory} />
              <input type="hidden" name="classroom" value={rawClassroom} />
              <Select name="completed" defaultValue={completed}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="yes">已完成</SelectItem>
                  <SelectItem value="no">未完成</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary" className="ml-2">
                应用
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* 결과 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>结果（{total}）</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr className="border-b">
                <th className="py-2 pr-4">学生</th>
                <th className="py-2 pr-4">班级</th>
                <th className="py-2 pr-4">视频</th>
                <th className="py-2 pr-4">分类</th>
                <th className="py-2 pr-4">观看/总时长</th>
                <th className="py-2 pr-4">% 完成</th>
                <th className="py-2 pr-4">状态</th>
                <th className="py-2 pr-4">最后观看</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r: Row) => (
                <tr key={`${r.student_id}-${r.video_id}`} className="border-b last:border-none">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{r.student_name}</div>
                    <div className="text-muted-foreground">{r.student_email}</div>
                  </td>
                  <td className="py-2 pr-4 whitespace-pre-line">{r.classrooms || "-"}</td>
                  <td className="py-2 pr-4">{r.video_title}</td>
                  <td className="py-2 pr-4">{r.category_name || "-"}</td>
                  <td className="py-2 pr-4">
                    {fmt(r.watched_duration)} / {fmt(r.video_duration ?? 0)}
                  </td>
                  <td className="py-2 pr-4">{(r.percent_viewed ?? 0).toFixed(2)}%</td>
                  <td className="py-2 pr-4">{r.completed ? "已完成" : "未完成"}</td>
                  <td className="py-2 pr-4">
                    {r.last_watched_at ? new Date(r.last_watched_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}

              {(rows ?? []).length === 0 && !loadError && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          <div className="flex justify-center gap-2 mt-6">
            <Button asChild variant="outline" disabled={page <= 1}>
              <Link
                href={`/admin/progress?${qs({
                  q,
                  category: category || ALL,
                  classroom: classroom || ALL,
                  completed,
                  page: String(page - 1),
                })}`}
              >
                上一页
              </Link>
            </Button>
            <div className="px-3 py-2 text-sm text-muted-foreground">
              第 {page} / {totalPages} 页
            </div>
            <Button asChild variant="outline" disabled={page >= totalPages}>
              <Link
                href={`/admin/progress?${qs({
                  q,
                  category: category || ALL,
                  classroom: classroom || ALL,
                  completed,
                  page: String(page + 1),
                })}`}
              >
                下一页
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
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
