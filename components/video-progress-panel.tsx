"use client"

import React, { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface Props {
  initialWatched: number
  totalDuration: number | null
}

export default function VideoProgressPanel({ initialWatched, totalDuration }: Props) {
  const [watched, setWatched] = useState<number>(initialWatched || 0)
  const [total, setTotal] = useState<number>(totalDuration || 0)
  const [completed, setCompleted] = useState<boolean>(false)

  useEffect(() => {
    const onProgress = (e: any) => {
      const d = e?.detail
      if (!d) return
      if (typeof d.watched === "number") setWatched(d.watched)
      if (typeof d.total === "number") setTotal(d.total)
      if (typeof d.completed === "boolean") setCompleted(d.completed)
    }
    window.addEventListener("ecampus:progress" as any, onProgress)
    return () => window.removeEventListener("ecampus:progress" as any, onProgress)
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">学习进度</span>
        {completed && <Badge>已完成</Badge>}
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{
            width: `${total ? Math.min(100, (watched / total) * 100) : 0}%`,
          }}
        />
      </div>
      <div className="text-sm text-muted-foreground">
        已观看：{formatTime(watched)} / {formatTime(total)}
      </div>
    </div>
  )
}

function formatTime(sec?: number | null) {
  if (!sec || Number.isNaN(sec)) return "0:00"
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}
