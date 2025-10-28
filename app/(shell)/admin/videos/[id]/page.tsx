// app/(shell)/admin/videos/[id]/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VideoEditForm } from "@/components/video-edit-form"
import { Separator } from "@/components/ui/separator"

interface PageProps {
  params: { id: string }   // ✅ App Router는 Promise 아님
}

export const dynamic = "force-dynamic"

export default async function VideoEditPage({ params }: PageProps) {
  const { id } = params
  const supabase = await createClient()

  // 1) 인증
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // 2) 권한
  const { data: me } = await supabase.from("profiles").select("role,name").eq("id", user.id).single()
  if (!me || (me.role !== "administrator" && me.role !== "owner")) {
    redirect("/dashboard")
  }

  // 3) 비디오 + 메타
  const { data: video } = await supabase
    .from("videos")
    .select(`
      id,
      title,
      url,
      created_at,
      updated_at,
      category_id,
      is_published,
      duration,
      uploader:profiles(name)
    `)
    .eq("id", id)
    .single()

  if (!video) redirect("/admin/videos")

  // 4) 카테고리 (선택 목록)
  const { data: categories = [] } = await supabase
    .from("categories")           // ✅ 테이블명 정정
    .select("id,name")
    .order("name", { ascending: true })

  return (
    <div className="space-y-6">
      {/* 상단 헤더/툴바 */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">编辑视频</h1>
          <p className="text-sm text-muted-foreground truncate">
            修改视频信息和设置
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/videos">返回视频列表</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/videos/${video.id}`} prefetch>
              预览
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌: 편집 폼 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle>视频信息</CardTitle>
            <CardDescription>标题、分类、发布状态、URL 等</CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <VideoEditForm video={video} categories={categories} />
          </CardContent>
        </Card>

        {/* 우: 메타 정보 / 상태 */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>元信息</CardTitle>
            <CardDescription>状态与时间、上传者</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* 发布状态 */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">当前状态</span>
              <Badge variant={video.is_published ? "default" : "secondary"}>
                {video.is_published ? "已发布" : "草稿"}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-muted-foreground">上传者</span>
              <span className="truncate">{video.uploader?.name ?? "未知"}</span>

              <span className="text-muted-foreground">时长</span>
              <span>{formatDuration(video.duration)}</span>

              <span className="text-muted-foreground">创建时间</span>
              <span>{formatDate(video.created_at)}</span>

              <span className="text-muted-foreground">更新时间</span>
              <span>{formatDate(video.updated_at)}</span>
            </div>

            <Separator />

            <div className="space-y-1">
              <div className="text-muted-foreground">视频地址</div>
              <code className="block rounded-md border bg-muted/40 p-2 text-xs break-all">
                {video.url || "—"}
              </code>
              {video.url && (
                <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                  <a href={video.url} target="_blank" rel="noreferrer">在新标签页打开</a>
                </Button>
              )}
            </div>

            {/* (선택) 위험 구역: 오너만 표시 */}
            {me.role === "owner" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">危险操作</div>
                  <Button variant="destructive" className="w-full" disabled>
                    删除视频（稍后接入）
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ---------- helpers ---------- */
function formatDate(v?: string | null) {
  try { return v ? new Date(v).toLocaleString("zh-CN") : "—" } catch { return "—" }
}
function formatDuration(seconds?: number | null) {
  if (!seconds && seconds !== 0) return "未知"
  const total = Math.max(0, Math.floor(Number(seconds)))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`
}
