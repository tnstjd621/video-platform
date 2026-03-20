// app/(shell)/progress/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  ArrowLeft, CheckCircle2, Clock, PlayCircle,
  TrendingUp, BookOpen, Timer
} from "lucide-react"
import { cn } from "@/lib/utils"

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, name, email")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/auth/login")

  const { data: progressRows = [] } = await supabase
    .from("student_progress")
    .select(`
      id, student_id, video_id, watched_duration, completed, last_watched_at,
      videos ( id, title, duration, thumbnail_url, category_id, categories ( name ) )
    `)
    .eq("student_id", user.id)
    .order("last_watched_at", { ascending: false })

  const { data: totalVideos = [] } = await supabase
    .from("videos")
    .select("id")
    .eq("is_published", true)

  const completedCount = progressRows.filter((r: any) => r.completed).length
  const totalPublished = totalVideos.length
  const totalWatchSec = progressRows.reduce((s: number, r: any) => s + (r.watched_duration || 0), 0)
  const inProgress = progressRows.filter((r: any) => !r.completed && (r.watched_duration || 0) > 0)
  const done = progressRows.filter((r: any) => r.completed)
  const overallPct = totalPublished > 0 ? Math.round((completedCount / totalPublished) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              学习进度
            </h1>
            <p className="text-sm text-muted-foreground mt-1">查看您的学习统计与课程完成情况</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回仪表板
            </Link>
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">已完成课程</p>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">共 {totalPublished} 门</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">完成率</p>
                  <p className="text-2xl font-bold">{overallPct}%</p>
                </div>
              </div>
              <Progress value={overallPct} className="h-1.5" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">总学习时长</p>
                <p className="text-2xl font-bold">{formatTotalTime(totalWatchSec)}</p>
                <p className="text-xs text-muted-foreground">累计观看时间</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <PlayCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">正在学习</p>
                <p className="text-2xl font-bold">{inProgress.length}</p>
                <p className="text-xs text-muted-foreground">进行中的课程</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 진행 중 */}
        {inProgress.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">正在学习</h2>
              <Badge variant="secondary">{inProgress.length}</Badge>
            </div>
            <div className="space-y-3">
              {inProgress.map((row: any) => (
                <ProgressItem key={row.id} row={row} />
              ))}
            </div>
          </div>
        )}

        {/* 완료됨 */}
        {done.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">已完成</h2>
              <Badge variant="secondary">{done.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {done.map((row: any) => (
                <ProgressCard key={row.id} row={row} />
              ))}
            </div>
          </div>
        )}

        {/* 아무 기록도 없을 때 */}
        {progressRows.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">您还没有开始学习任何课程</p>
              <Button asChild>
                <Link href="/courses">前往课程中心</Link>
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}

/* ─────────────────── 컴포넌트 ─────────────────── */

function ProgressItem({ row }: { row: any }) {
  const vid = row.videos
  const pct = vid?.duration ? Math.min(100, (row.watched_duration / vid.duration) * 100) : 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        {/* 썸네일 */}
        <div className="w-28 h-16 rounded-lg bg-muted overflow-hidden shrink-0 relative">
          {vid?.thumbnail_url ? (
            <img src={vid.thumbnail_url} alt={vid?.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">
              缩略图
            </div>
          )}
          <div className="absolute right-1 bottom-1 rounded bg-black/70 text-[10px] text-white px-1">
            {formatDuration(vid?.duration)}
          </div>
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{vid?.title}</h3>
            <Badge variant="outline" className="text-xs shrink-0">
              {vid?.categories?.name || "未分类"}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDuration(row.watched_duration)} / {formatDuration(vid?.duration)}</span>
              <span className="font-medium text-foreground">{Math.round(pct)}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-orange-400"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            最后观看：{formatDate(row.last_watched_at)}
          </p>
        </div>

        <Button asChild size="sm" className="shrink-0">
          <Link href={`/videos/${row.video_id}`}>
            {row.completed ? "重新观看" : "继续学习"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ProgressCard({ row }: { row: any }) {
  const vid = row.videos
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-muted">
        {vid?.thumbnail_url ? (
          <img
            src={vid.thumbnail_url}
            alt={vid?.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
            缩略图
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute left-2 top-2">
          <Badge className="text-xs bg-green-500/90 text-white border-0 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            已完成
          </Badge>
        </div>
        <div className="absolute left-2 bottom-2">
          <Badge variant="outline" className="text-xs bg-white/90 backdrop-blur">
            {vid?.categories?.name || "未分类"}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h4 className="font-medium line-clamp-2 text-sm">{vid?.title}</h4>
        <p className="text-xs text-muted-foreground mt-1.5">
          完成于 {formatDate(row.last_watched_at)}
        </p>
        <Button asChild size="sm" variant="outline" className="w-full mt-3">
          <Link href={`/videos/${row.video_id}`}>重新观看</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/* ─────────────────── utils ─────────────────── */

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatTotalTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}小时${m > 0 ? `${m}分` : ""}`
}

function formatDate(d?: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("zh-CN", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}