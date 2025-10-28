// app/(shell)/progress/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // 프로필
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, name, email")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/auth/login")

  // 내 학습 진행(비디오 정보 포함)
  const { data: progressRows = [] } = await supabase
    .from("student_progress")
    .select(`
      id,
      student_id,
      video_id,
      watched_duration,
      completed,
      last_watched_at,
      videos (
        id,
        title,
        duration,
        thumbnail_url,
        category_id,
        categories ( name )
      )
    `)
    .eq("student_id", user.id)
    .order("last_watched_at", { ascending: false })

  // 학생에게 보이는 전체 공개 비디오 수(영상 RLS가 접근 가능한 것만 내려옴)
  const { data: totalVideos = [] } = await supabase
    .from("videos")
    .select("id")
    .eq("is_published", true)

  // 집계
  const completedCount = progressRows.filter((r: any) => r.completed).length
  const totalPublished = totalVideos.length
  const totalWatchSec = progressRows.reduce(
    (s: number, r: any) => s + (r.watched_duration || 0),
    0
  )

  const inProgress = progressRows.filter(
    (r: any) => !r.completed && (r.watched_duration || 0) > 0
  )
  const done = progressRows.filter((r: any) => r.completed)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">学习进度</h1>
          <p className="text-sm text-muted-foreground">查看您的学习统计与课程完成情况</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">返回仪表板</Link>
        </Button>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="已完成课程"
          value={completedCount}
          subtitle={`共 ${totalPublished} 门课程`}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">完成率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPublished > 0
                ? Math.round((completedCount / totalPublished) * 100)
                : 0}
              %
            </div>
            <Progress
              className="mt-2"
              value={
                totalPublished > 0
                  ? (completedCount / totalPublished) * 100
                  : 0
              }
            />
          </CardContent>
        </Card>
        <StatCard
          title="总学习时长"
          value={formatTotalTime(totalWatchSec)}
          subtitle="累计观看时间"
        />
        <StatCard
          title="正在学习"
          value={inProgress.length}
          subtitle="进行中的课程"
        />
      </div>

      {/* 진행 중 */}
      <Section
        title="正在学习"
        description="最近观看的课程会显示在这里，继续学习以完成课程。"
        emptyText="暂无进行中的课程"
      >
        {inProgress.length > 0 && (
          <div className="space-y-4">
            {inProgress.map((row: any) => (
              <ProgressItem key={row.id} row={row} />
            ))}
          </div>
        )}
      </Section>

      {/* 완료됨 */}
      <Section
        title="已完成"
        description="你已经学完的课程。"
        emptyText="暂无完成的课程"
      >
        {done.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {done.map((row: any) => (
              <ProgressCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </Section>

      {/* 아직 진행기록이 없는 경우 CTA */}
      {progressRows.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">
              您还没有开始学习任何课程
            </p>
            <Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              <Link href="/courses">前往课程中心</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* =============== UI 분리 컴포넌트 =============== */

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string | number
  subtitle?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

function Section({
  title,
  description,
  emptyText,
  children,
}: {
  title: string
  description?: string
  emptyText: string
  children?: React.ReactNode
}) {
  const isEmpty = !children
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <CardDescription className="mt-1">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="py-10 text-center text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function ProgressItem({ row }: { row: any }) {
  const vid = row.videos
  const percent =
    vid?.duration ? Math.min(100, (row.watched_duration / vid.duration) * 100) : 0
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      {/* 썸네일 */}
      <div className="w-28 h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative">
        {vid?.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vid.thumbnail_url}
            alt={vid?.title || "thumbnail"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="grid place-items-center h-full text-xs text-muted-foreground">
            缩略图
          </div>
        )}
        <div className="absolute right-1 bottom-1 rounded bg-black/70 text-[10px] text-white px-1">
          {formatDuration(vid?.duration)}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm truncate">{vid?.title}</h3>
          <Badge variant="outline" className="text-xs">
            {vid?.categories?.name || "未分类"}
          </Badge>
          <Badge variant={row.completed ? "default" : "secondary"} className="text-xs">
            {row.completed ? "已完成" : "进行中"}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatDuration(row.watched_duration)} / {formatDuration(vid?.duration)}
            </span>
            <span>{Math.round(percent)}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          最后观看：{formatDate(row.last_watched_at)}
        </p>
      </div>

      <Button asChild size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
        <Link href={`/videos/${row.video_id}`}>{row.completed ? "重新观看" : "继续学习"}</Link>
      </Button>
    </div>
  )
}

function ProgressCard({ row }: { row: any }) {
  const vid = row.videos
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-muted">
        {vid?.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vid.thumbnail_url}
            alt={vid?.title || "thumbnail"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            缩略图
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Badge variant="outline" className="bg-white/90 backdrop-blur text-xs">
            {vid?.categories?.name || "未分类"}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-medium line-clamp-2">{vid?.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              完成于 {formatDate(row.last_watched_at)}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/videos/${row.video_id}`}>重新观看</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================== utils ================== */

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatTotalTime(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}小时${m}分钟`
}

function formatDate(d?: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleString("zh-CN")
}
