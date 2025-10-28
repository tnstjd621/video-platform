// app/(shell)/admin/videos/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VideosToolbar } from "@/components/admin/videos-toolbar"

type SearchParams = {
  q?: string
  status?: "all" | "published" | "draft"
  category?: string // category_id or "all"
  page?: string
  pageSize?: string
}

export const dynamic = "force-dynamic"

export default async function VideosManagementPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  // 인증
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // 권한
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || (me.role !== "administrator" && me.role !== "owner")) redirect("/dashboard")

  // 필터 파라미터
  const q = (searchParams.q ?? "").trim()
  const status = (searchParams.status ?? "all") as NonNullable<SearchParams["status"]>
  const categoryId = (searchParams.category ?? "all")
  const pageSize = Math.min(Math.max(parseInt(searchParams.pageSize ?? "12", 10) || 12, 5), 50)
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // 분류 목록 (툴바 Select용)
  const { data: categories = [] } = await supabase
    .from("categories")
    .select("id,name")
    .order("name", { ascending: true })

  // 총 건수
  let countQuery = supabase
    .from("videos")
    .select("*", { count: "exact", head: true })

  if (q) countQuery = countQuery.ilike("title", `%${q}%`)
  if (status !== "all") countQuery = countQuery.eq("is_published", status === "published")
  if (categoryId !== "all") countQuery = countQuery.eq("category_id", categoryId)

  const { count = 0 } = await countQuery

  // 목록
  let listQuery = supabase
    .from("videos")
    .select(`
      id,
      title,
      url,
      created_at,
      category_id,
      is_published,
      duration,
      category:categories(name),
      uploader:profiles(name)
    `)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (q) listQuery = listQuery.ilike("title", `%${q}%`)
  if (status !== "all") listQuery = listQuery.eq("is_published", status === "published")
  if (categoryId !== "all") listQuery = listQuery.eq("category_id", categoryId)

  const { data: videos = [] } = await listQuery
  const totalPages = Math.max(Math.ceil(count / pageSize), 1)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">视频管理</h1>
          <p className="text-sm text-muted-foreground">管理系统中的所有视频内容</p>
        </div>
        <div className="flex gap-2">
          {me.role === "owner" && (
            <Button asChild>
              <Link href="/admin/videos/upload">上传视频</Link>
            </Button>
          )}
        </div>
      </div>

      {/* 툴바 */}
      <VideosToolbar
        q={q}
        status={status}
        categoryId={categoryId}
        pageSize={pageSize}
        categories={categories}
        total={count}
      />

      {/* 표 */}
      <Card>
        <CardHeader>
          <CardTitle>视频列表（{count}）</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px]">标题</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>上传者</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时长</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      暂无数据。请更改筛选条件或上传新视频。
                    </TableCell>
                  </TableRow>
                ) : (
                  videos.map((v) => (
                    <TableRow key={v.id} className="align-middle">
                      <TableCell className="font-medium truncate">{v.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{v.category?.name ?? "未分类"}</Badge>
                      </TableCell>
                      <TableCell>{v.uploader?.name ?? "未知"}</TableCell>
                      <TableCell>
                        <Badge variant={v.is_published ? "default" : "secondary"}>
                          {v.is_published ? "已发布" : "草稿"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDuration(v.duration)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(v.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* 预览 */}
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/videos/${v.id}`}>预览</Link>
                          </Button>
                          {/* 编辑（owner 전용) */}
                          {me.role === "owner" && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/videos/${v.id}`}>编辑</Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              第 {count === 0 ? 0 : from + 1}-{Math.min(to + 1, count)} 条，共 {count} 条
            </div>
            <div className="flex items-center gap-2">
              <PagerButton href={buildHref({ q, status, categoryId, page: page - 1, pageSize })} disabled={page <= 1}>
                上一页
              </PagerButton>
              <span className="text-sm text-muted-foreground">第 {page} / {totalPages} 页</span>
              <PagerButton href={buildHref({ q, status, categoryId, page: page + 1, pageSize })} disabled={page >= totalPages}>
                下一页
              </PagerButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- helpers ---------- */

function buildHref({
  q, status, categoryId, page, pageSize,
}: { q?: string; status?: string; categoryId?: string; page: number; pageSize: number }) {
  const usp = new URLSearchParams()
  if (q) usp.set("q", q)
  if (status && status !== "all") usp.set("status", status)
  if (categoryId && categoryId !== "all") usp.set("category", categoryId)
  usp.set("page", String(Math.max(page, 1)))
  usp.set("pageSize", String(pageSize))
  return `/admin/videos?${usp.toString()}`
}

function formatDate(v?: string) {
  try { return new Date(v ?? "").toLocaleString("zh-CN") } catch { return "—" }
}

function formatDuration(seconds?: number | null) {
  if (!seconds && seconds !== 0) return "未知"
  const total = Math.max(0, Math.floor(Number(seconds)))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`
}

function PagerButton({ href, disabled, children }: { href: string; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) return <Button variant="outline" size="sm" disabled>{children}</Button>
  return <Button asChild variant="outline" size="sm"><Link href={href}>{children}</Link></Button>
}
