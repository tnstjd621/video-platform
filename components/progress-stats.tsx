"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ProgressStatsProps {
  userId: string
}

interface ProgressStats {
  totalVideos: number
  completedVideos: number
  totalWatchTime: number
  inProgressVideos: number
}

export function ProgressStats({ userId }: ProgressStatsProps) {
  const [stats, setStats] = useState<ProgressStats>({
    totalVideos: 0,
    completedVideos: 0,
    totalWatchTime: 0,
    inProgressVideos: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      try {
        // Get total published videos
        const { data: totalVideos } = await supabase.from("videos").select("id").eq("is_published", true)

        // Get user progress
        const { data: progressData } = await supabase.from("student_progress").select("*").eq("student_id", userId)

        const completedVideos = progressData?.filter((p) => p.completed).length || 0
        const totalWatchTime = progressData?.reduce((sum, p) => sum + (p.watched_duration || 0), 0) || 0
        const inProgressVideos = progressData?.filter((p) => !p.completed && p.watched_duration > 0).length || 0

        setStats({
          totalVideos: totalVideos?.length || 0,
          completedVideos,
          totalWatchTime,
          inProgressVideos,
        })
      } catch (error) {
        console.error("Failed to fetch progress stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">已完成课程</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{stats.completedVideos}</div>
          <p className="text-xs text-muted-foreground">共 {stats.totalVideos} 门课程</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">完成率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {stats.totalVideos > 0 ? Math.round((stats.completedVideos / stats.totalVideos) * 100) : 0}%
          </div>
          <Progress
            value={stats.totalVideos > 0 ? (stats.completedVideos / stats.totalVideos) * 100 : 0}
            className="mt-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">总学习时长</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatTotalTime(stats.totalWatchTime)}</div>
          <p className="text-xs text-muted-foreground">累计观看时间</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">正在学习</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{stats.inProgressVideos}</div>
          <p className="text-xs text-muted-foreground">进行中的课程</p>
        </CardContent>
      </Card>
    </div>
  )
}

function formatTotalTime(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}分钟`
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分钟`
}
