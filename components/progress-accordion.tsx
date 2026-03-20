"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ChevronDown, ChevronUp, CheckCircle2,
  Clock, User,
} from "lucide-react"
import { cn } from "@/lib/utils"

type VideoRow = {
  video_id: string
  video_title: string
  category_name: string | null
  duration: number | null
  watched: number | null
  percent_viewed: number | null
  completed: boolean
  last_watched_at: string | null
}

type StudentData = {
  student_id: string
  student_name: string
  student_email: string
  classroom_name: string
  videos: VideoRow[]
}

function fmtTime(sec?: number | null) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function StudentAccordionItem({ student }: { student: StudentData }) {
  const [open, setOpen] = useState(false)

  const completedVideos = student.videos.filter((v) => v.completed).length
  const totalVideos = student.videos.length
  const overallPct = totalVideos > 0
    ? Math.round((completedVideos / totalVideos) * 100)
    : 0

  return (
    <Card className="overflow-hidden">
      {/* 헤더 - 클릭시 열기/닫기 */}
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
      >
        {/* 아바타 */}
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="text-sm font-semibold">
            {student.student_name?.[0] ?? <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>

        {/* 이름 + 이메일 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{student.student_name}</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
              {student.classroom_name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {student.student_email}
          </p>
        </div>

        {/* 전체 진행률 바 */}
        <div className="hidden sm:flex flex-col items-end gap-1.5 w-36 shrink-0">
          <div className="flex justify-between w-full text-xs text-muted-foreground">
            <span>{completedVideos}/{totalVideos} 视频</span>
            <span className="font-medium text-foreground">{overallPct}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                overallPct === 100 ? "bg-green-500" :
                overallPct >= 50 ? "bg-blue-500" : "bg-orange-400"
              )}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* 화살표 */}
        <div className="ml-2 shrink-0 text-muted-foreground">
          {open
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* 펼쳐지는 영상 목록 */}
      {open && (
        <div className="border-t divide-y divide-border bg-muted/20">
          {student.videos.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">暂无进度记录</p>
          ) : (
            student.videos.map((v) => {
              const pct = v.percent_viewed ?? 0
              return (
                <div key={v.video_id} className="px-5 py-3.5 flex items-center gap-4">
                  {/* 완료 아이콘 */}
                  <div className="shrink-0">
                    {v.completed
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <Clock className="w-4 h-4 text-muted-foreground" />}
                  </div>

                  {/* 영상 제목 + 카테고리 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.video_title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {v.category_name && (
                        <span className="text-xs text-muted-foreground">
                          {v.category_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        最后观看：{fmtDate(v.last_watched_at)}
                      </span>
                    </div>
                  </div>

                  {/* 진행률 바 + 시간 */}
                  <div className="hidden sm:flex flex-col items-end gap-1.5 w-36 shrink-0">
                    <div className="flex justify-between w-full text-xs text-muted-foreground">
                      <span>{fmtTime(v.watched)} / {fmtTime(v.duration)}</span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          v.completed ? "bg-green-500" :
                          pct >= 50 ? "bg-blue-500" : "bg-orange-400"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* 상태 배지 */}
                  <div className="shrink-0">
                    {v.completed ? (
                      <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">
                        已完成
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        进行中
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </Card>
  )
}

export default function ProgressAccordion({ students }: { students: StudentData[] }) {
  const [allOpen, setAllOpen] = useState(false)

  return (
    <div className="space-y-3">
      {/* 전체 펼치기/접기 버튼 */}
      <div className="flex justify-end">
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          onClick={() => setAllOpen((prev) => !prev)}
        >
          {allOpen ? "全部收起" : "全部展开"}
        </button>
      </div>

      {students.map((student) => (
        <StudentAccordionItemControlled
          key={student.student_id}
          student={student}
          forceOpen={allOpen}
        />
      ))}
    </div>
  )
}

// 전체 열기/닫기를 지원하는 컨트롤드 버전
function StudentAccordionItemControlled({
  student,
  forceOpen,
}: {
  student: StudentData
  forceOpen: boolean
}) {
  const [open, setOpen] = useState(false)

  // forceOpen 상태와 동기화
  const isOpen = forceOpen || open

  const completedVideos = student.videos.filter((v) => v.completed).length
  const totalVideos = student.videos.length
  const overallPct = totalVideos > 0
    ? Math.round((completedVideos / totalVideos) * 100)
    : 0

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="text-sm font-semibold">
            {student.student_name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{student.student_name}</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
              {student.classroom_name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {student.student_email}
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1.5 w-36 shrink-0">
          <div className="flex justify-between w-full text-xs text-muted-foreground">
            <span>{completedVideos}/{totalVideos} 视频</span>
            <span className="font-medium text-foreground">{overallPct}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                overallPct === 100 ? "bg-green-500" :
                overallPct >= 50 ? "bg-blue-500" : "bg-orange-400"
              )}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        <div className="ml-2 shrink-0 text-muted-foreground">
          {isOpen
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t divide-y divide-border bg-muted/20">
          {student.videos.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">暂无进度记录</p>
          ) : (
            student.videos.map((v) => {
              const pct = v.percent_viewed ?? 0
              return (
                <div key={v.video_id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="shrink-0">
                    {v.completed
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <Clock className="w-4 h-4 text-muted-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.video_title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {v.category_name && (
                        <span className="text-xs text-muted-foreground">{v.category_name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        最后观看：{fmtDate(v.last_watched_at)}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-1.5 w-36 shrink-0">
                    <div className="flex justify-between w-full text-xs text-muted-foreground">
                      <span>{fmtTime(v.watched)} / {fmtTime(v.duration)}</span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          v.completed ? "bg-green-500" :
                          pct >= 50 ? "bg-blue-500" : "bg-orange-400"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="shrink-0">
                    {v.completed ? (
                      <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">
                        已完成
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">进行中</Badge>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </Card>
  )
}