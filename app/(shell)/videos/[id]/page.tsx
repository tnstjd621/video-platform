import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { VideoPlayer } from "@/components/video-player"
import { ArrowLeft, Pencil, Clock, User, Calendar, BookOpen, PlayCircle } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "0:00"
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
  return `${m}:${String(r).padStart(2, "0")}`
}

export default async function VideoPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,name,email")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/auth/login")

  const { data: video, error: vErr } = await supabase
    .from("videos")
    .select(`
      id, title, description, url, duration, category_id, is_published, created_at, uploaded_by,
      categories:category_id ( id, name, parent_id ),
      profiles:uploaded_by ( name, email )
    `)
    .eq("id", id)
    .single()

  if (!video || vErr) redirect("/courses")

  if (profile.role === "student") {
    if (!video.is_published) redirect("/courses")

    const catIds: string[] = []
    if (video.category_id) catIds.push(video.category_id)
    if (video.categories?.parent_id) catIds.push(video.categories.parent_id)

    let allowed = false
    if (catIds.length > 0) {
      const { data: access } = await supabase
        .from("category_access")
        .select("id")
        .eq("student_id", user.id)
        .in("category_id", catIds)
        .maybeSingle()
      allowed = !!access
    }
    if (!allowed) redirect("/courses")
  }

  // 학생 진행도
  let initialProgress = 0
  if (profile.role === "student") {
    const { data: prog } = await supabase
      .from("student_progress")
      .select("watched_duration")
      .eq("student_id", user.id)
      .eq("video_id", id)
      .maybeSingle()
    if (prog?.watched_duration) initialProgress = prog.watched_duration
  }

  // 연관 비디오
  let related: any[] = []
  if (video.category_id) {
    const { data: rel = [] } = await supabase
      .from("videos")
      .select("id,title,thumbnail_url,duration,is_published,created_at,category_id")
      .eq("is_published", true)
      .eq("category_id", video.category_id)
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(6)
    related = rel
  }

  const percent =
    video.duration && initialProgress > 0
      ? Math.min(100, (initialProgress / video.duration) * 100)
      : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm">
            <Link href="/courses">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回课程列表
            </Link>
          </Button>
          {(profile.role === "administrator" || profile.role === "owner") && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/admin/videos/${video.id}`}>
                <Pencil className="w-3.5 h-3.5" />
                编辑视频
              </Link>
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 플레이어 + 설명 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 비디오 제목 (모바일용) */}
            <div className="lg:hidden">
              <h1 className="text-xl font-bold">{video.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline">{video.categories?.name || "未分类"}</Badge>
                <Badge variant={video.is_published ? "default" : "secondary"}>
                  {video.is_published ? "已发布" : "草稿"}
                </Badge>
              </div>
            </div>

            {/* 플레이어 */}
            <div className="rounded-xl overflow-hidden shadow-md">
              <VideoPlayer
                videoUrl={video.url || ""}
                videoId={video.id}
                userId={user.id}
                userRole={profile.role}
                initialProgress={initialProgress}
              />
            </div>

            {/* 진행도 바 (학생) */}
            {profile.role === "student" && (
              <div className="rounded-xl border bg-card px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5" />
                    观看进度
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDuration(initialProgress)} / {formatDuration(video.duration)}
                    {video.duration ? `  ${Math.round(percent)}%` : ""}
                  </span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>
            )}

            {/* 설명 */}
            {video.description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">课程简介</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap leading-7 text-sm text-muted-foreground">
                    {video.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 연관 비디오 */}
            {related.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    同类课程
                  </CardTitle>
                  <CardDescription>与本课程同一分类的其他内容</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {related.map((rv) => (
                      <Link href={`/videos/${rv.id}`} key={rv.id}>
                        <div className="group cursor-pointer rounded-lg border hover:shadow-md transition-shadow overflow-hidden">
                          <div className="relative aspect-video bg-muted">
                            {rv.thumbnail_url ? (
                              <img
                                src={rv.thumbnail_url}
                                alt={rv.title}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 grid place-items-center text-muted-foreground text-xs">
                                视频缩略图
                              </div>
                            )}
                            <div className="absolute right-2 bottom-2 rounded bg-black/70 text-[11px] text-white px-1.5 py-0.5">
                              {formatDuration(rv.duration)}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-3">
                              <p className="line-clamp-2 text-white text-sm font-medium drop-shadow">
                                {rv.title}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 사이드 정보 */}
          <div className="lg:sticky lg:top-20 h-max space-y-4">
            <Card>
              <CardHeader>
                {/* 비디오 제목 (데스크탑) */}
                <CardTitle className="text-balance hidden lg:block">{video.title}</CardTitle>
                <div className="hidden lg:flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline">{video.categories?.name || "未分类"}</Badge>
                  <Badge variant={video.is_published ? "default" : "secondary"}>
                    {video.is_published ? "已发布" : "草稿"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">

                {/* 메타 정보 */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      上传者
                    </span>
                    <span className="font-medium">{video.profiles?.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      上传时间
                    </span>
                    <span className="font-medium">
                      {new Date(video.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      时长
                    </span>
                    <span className="font-medium">{formatDuration(video.duration)}</span>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  )
}