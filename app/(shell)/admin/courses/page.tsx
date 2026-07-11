import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import CategoryPickerClient from "@/components/courses-category-picker"

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,name")
    .eq("id", user.id)
    .single()

  if (!profile || !["owner", "administrator", "supervisor"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const sp = await searchParams
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) || ""
  const cat = (Array.isArray(sp.cat) ? sp.cat[0] : sp.cat) || "all"
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) || "new" // new | title

  // 모든 영상 조회 (발행 여부 무관)
  const baseSelect = `
    id, title, description, duration_seconds, thumbnail_url, category_id, is_published, created_at,
    categories(name)
  `
  let query = supabase.from("videos").select(baseSelect)

  if (cat === "none") query = query.is("category_id", null)
  else if (cat !== "all") query = query.eq("category_id", cat)

  if (q.trim()) query = query.ilike("title", `%${q.trim()}%`)
  if (sort === "title") query = query.order("title", { ascending: true })
  else query = query.order("created_at", { ascending: false })

  const { data: videos = [] } = await query

  // 전체 카테고리 표시 (관리자/오너/supervisor는 전체 카테고리 다 볼 수 있음)
  const { data: catsAll = [] } = await supabase.from("categories").select("id,name").order("name")
  const categoryItems = catsAll.map((c: any) => ({ id: c.id, name: c.name }))
  if (videos.some((v: any) => v.category_id === null)) {
    categoryItems.push({ id: "none", name: "未分类" })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">全部课程（管理视图）</h1>
          <p className="text-sm text-muted-foreground">查看系统中的所有视频，包括未发布的草稿</p>
        </div>
        <div className="flex items-center gap-2">
          {(profile.role === "administrator" || profile.role === "owner") && (
            <Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              <Link href="/admin/videos/upload">上传视频</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/dashboard">返回仪表板</Link>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>筛选与搜索</CardTitle>
          <CardDescription>按分类、关键字与排序查看课程</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CategoryPickerClient
            categories={[{ id: "all", name: "全部" }, ...categoryItems]}
            active={cat}
            q={q}
            sort={sort}
          />
          <form className="flex items-center gap-2" action="/admin/courses">
            <Input name="q" defaultValue={q} placeholder="搜索课程标题…" className="w-[220px]" />
            <input type="hidden" name="cat" value={cat} />
            <select
              name="sort"
              defaultValue={sort}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="new">按最新</option>
              <option value="title">按标题</option>
            </select>
            <Button type="submit" variant="outline">应用</Button>
          </form>
        </CardContent>
      </Card>

      {/* Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {videos.map((video: any) => {
            const href = `/videos/${video.id}`
            const catName = video.categories?.name || "未分类"
            return (
              <Card key={video.id} className="group/vid overflow-hidden transition-all hover:shadow-lg">
                <div className="relative aspect-video bg-muted">
                  {video.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnail_url} alt={video.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-muted-foreground">视频缩略图</div>
                  )}
                  <div className="absolute left-2 top-2 flex items-center gap-2">
                    <Badge variant="outline" className="bg-white/90 backdrop-blur text-xs">{catName}</Badge>
                    <Badge
                      variant={video.is_published ? "default" : "secondary"}
                      className={video.is_published ? "bg-emerald-500 hover:bg-emerald-500 text-white" : ""}
                    >
                      {video.is_published ? "已发布" : "草稿"}
                    </Badge>
                  </div>
                  <div className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
                    {video.duration_seconds ? formatDuration(video.duration_seconds) : "时长未知"}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="line-clamp-2 text-white text-sm font-medium drop-shadow">{video.title}</div>
                  </div>
                </div>
                <CardContent className="p-4">
                  {video.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{video.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{new Date(video.created_at).toLocaleDateString("zh-CN")}</span>
                    <Button asChild size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
                      <Link href={href}>开始学习</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">暂无课程</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}