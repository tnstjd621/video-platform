// app/(shell)/admin/videos/page.tsx
import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VideosToolbar } from "@/components/admin/videos-toolbar"
import { PlusCircle, Play, Pencil, Clock, Film, BookOpen, LayoutGrid } from "lucide-react"

type SearchParams = {
  q?: string
  status?: "all" | "published" | "draft"
  category?: string
  page?: string
  pageSize?: string
}

export const dynamic = "force-dynamic"

export default async function VideosManagementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || (me.role !== "administrator" && me.role !== "owner")) redirect("/dashboard")

  // ✅ Next.js 15: searchParams를 await로 unwrap
  const {
    q: rawQ,
    status: rawStatus,
    category,
    page: rawPage,
    pageSize: rawPageSize,
  } = await searchParams

  const q = (rawQ ?? "").trim()
  const status = (rawStatus ?? "all") as NonNullable<SearchParams["status"]>
  const categoryId = (category ?? "all")
  const pageSize = Math.min(Math.max(parseInt(rawPageSize ?? "12", 10) || 12, 5), 50)
  const page = Math.max(parseInt(rawPage ?? "1", 10) || 1, 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: categories = [] } = await supabase
    .from("categories")
    .select("id,name")
    .order("name", { ascending: true })

  let countQuery = supabase.from("videos").select("*", { count: "exact", head: true })
  if (q) countQuery = countQuery.ilike("title", `%${q}%`)
  if (status !== "all") countQuery = countQuery.eq("is_published", status === "published")
  if (categoryId !== "all") countQuery = countQuery.eq("category_id", categoryId)
  const { count = 0 } = await countQuery

  let listQuery = supabase
    .from("videos")
    .select(`id, title, url, created_at, category_id, is_published, duration, category:categories(name), uploader:profiles(name)`)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (q) listQuery = listQuery.ilike("title", `%${q}%`)
  if (status !== "all") listQuery = listQuery.eq("is_published", status === "published")
  if (categoryId !== "all") listQuery = listQuery.eq("category_id", categoryId)

  const { data: videos = [] } = await listQuery
  const totalPages = Math.max(Math.ceil(count / pageSize), 1)

  const publishedCount = videos.filter(v => v.is_published).length
  const draftCount = videos.filter(v => !v.is_published).length

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Film className="w-6 h-6 text-primary" />
              视频管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">管理系统中的所有视频内容</p>
          </div>
          {me.role === "owner" && (
            <Button asChild className="gap-2">
              <Link href="/admin/videos/upload">
                <PlusCircle className="w-4 h-4" />
                上传视频
              </Link>
            </Button>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">视频总数</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">已发布</p>
              <p className="text-2xl font-bold">{publishedCount}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">草稿</p>
              <p className="text-2xl font-bold">{draftCount}</p>
            </div>
          </div>
        </div>

        {/* 툴바 */}
        <Suspense fallback={null}>
          <VideosToolbar
            q={q}
            status={status}
            categoryId={categoryId}
            pageSize={pageSize}
            categories={categories}
            total={count}
          />
        </Suspense>

        {/* 테이블 */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <p className="text-sm font-medium">
              视频列表
              <span className="ml-2 text-muted-foreground font-normal">({count})</span>
            </p>
            <p className="text-xs text-muted-foreground">
              第 {count === 0 ? 0 : from + 1}–{Math.min(to + 1, count)} 条，共 {count} 条
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[300px]">标题</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">分类</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">上传者</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">状态</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">时长</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">上传时间</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {videos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      暂无数据。请更改筛选条件或上传新视频。
                    </td>
                  </tr>
                ) : (
                  videos.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Play className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="font-medium truncate max-w-[220px]">{v.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="text-xs">
                          {v.category?.name ?? "未分类"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-sm">
                        {v.uploader?.name ?? "未知"}
                      </td>
                      <td className="px-5 py-4">
                        {v.is_published ? (
                          <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">
                            已发布
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">草稿</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatDuration(v.duration)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(v.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
                            <Link href={`/videos/${v.id}`}>
                              <Play className="w-3 h-3" />
                              预览
                            </Link>
                          </Button>
                          {me.role === "owner" && (
                            <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
                              <Link href={`/admin/videos/${v.id}`}>
                                <Pencil className="w-3 h-3" />
                                编辑
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">
                第 {page} / {totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <PagerButton
                  href={buildHref({ q, status, categoryId, page: page - 1, pageSize })}
                  disabled={page <= 1}
                >
                  上一页
                </PagerButton>
                <PagerButton
                  href={buildHref({ q, status, categoryId, page: page + 1, pageSize })}
                  disabled={page >= totalPages}
                >
                  下一页
                </PagerButton>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

function buildHref({ q, status, categoryId, page, pageSize }: {
  q?: string; status?: string; categoryId?: string; page: number; pageSize: number
}) {
  const usp = new URLSearchParams()
  if (q) usp.set("q", q)
  if (status && status !== "all") usp.set("status", status)
  if (categoryId && categoryId !== "all") usp.set("category", categoryId)
  usp.set("page", String(Math.max(page, 1)))
  usp.set("pageSize", String(pageSize))
  return `/admin/videos?${usp.toString()}`
}

function formatDate(v?: string) {
  try {
    return new Date(v ?? "").toLocaleDateString("zh-CN", {
      year: "numeric", month: "short", day: "numeric"
    })
  } catch { return "—" }
}

function formatDuration(seconds?: number | null) {
  if (!seconds && seconds !== 0) return "未知"
  const total = Math.max(0, Math.floor(Number(seconds)))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`
}

function PagerButton({ href, disabled, children }: {
  href: string; disabled?: boolean; children: React.ReactNode
}) {
  if (disabled) return <Button variant="outline" size="sm" disabled>{children}</Button>
  return <Button asChild variant="outline" size="sm"><Link href={href}>{children}</Link></Button>
}