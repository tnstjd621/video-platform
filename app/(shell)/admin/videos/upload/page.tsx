"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"

type Category = { id: string; name: string }

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function VideoUploadPage() {
  const supabase = createClient()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // duration 관련 상태
  const [duration, setDuration] = useState<number | null>(null)
  const [durationLoading, setDurationLoading] = useState(false)
  const [durationError, setDurationError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.from("categories").select("id,name").order("name")
      setCategories(data || [])
    }
    run()
  }, [supabase])

  const isYouTubeUrl = (u: string) => /(youtube\.com|youtu\.be)\//i.test(u)

  // YouTube URL 입력 후 포커스 벗어나면 자동으로 duration 가져오기
  const handleUrlBlur = async () => {
    if (!youtubeUrl || !isYouTubeUrl(youtubeUrl)) return
    if (duration !== null) return // 이미 가져온 경우 스킵

    setDurationLoading(true)
    setDurationError(null)
    setDuration(null)

    try {
      const res = await fetch(`/api/youtube-duration?url=${encodeURIComponent(youtubeUrl)}`)
      const json = await res.json()

      if (!res.ok || json.error) {
        setDurationError("영상 길이를 가져오지 못했어요. 저장 후 자동 업데이트됩니다.")
      } else {
        setDuration(json.duration)
      }
    } catch {
      setDurationError("네트워크 오류. 저장 후 자동 업데이트됩니다.")
    } finally {
      setDurationLoading(false)
    }
  }

  // URL이 바뀌면 duration 초기화
  const handleUrlChange = (val: string) => {
    setYoutubeUrl(val)
    setDuration(null)
    setDurationError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!title || !categoryId || !youtubeUrl) {
      setError("请填写所有必填字段")
      return
    }
    if (!isYouTubeUrl(youtubeUrl)) {
      setError("请输入有效的 YouTube 链接")
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("用户未登录")

      const { error: insertError } = await supabase.from("videos").insert({
        title,
        url: youtubeUrl.trim(),
        category_id: categoryId,
        uploaded_by: user.id,
        is_published: isPublished,
        // ✅ duration이 있으면 함께 저장
        ...(duration !== null ? { duration } : {}),
      })
      if (insertError) throw insertError

      setSuccess("视频登记成功！")
      setTitle("")
      setYoutubeUrl("")
      setCategoryId("")
      setDuration(null)
      router.push("/admin/videos")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">登记 YouTube 视频</h1>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-2">
            <Label htmlFor="title">标题 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>分类 *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yt">YouTube 链接 *</Label>
            <Input
              id="yt"
              type="url"
              placeholder="https://www.youtube.com/watch?v=XXXX 或 https://youtu.be/XXXX"
              value={youtubeUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleUrlBlur}
            />
            <p className="text-xs text-muted-foreground">
              系统会自动识别并以嵌入方式播放，同时记录学习进度。
            </p>

            {/* duration 상태 표시 */}
            {durationLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>正在获取视频时长...</span>
              </div>
            )}
            {duration !== null && !durationLoading && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>视频时长：{formatTime(duration)}</span>
              </div>
            )}
            {durationError && !durationLoading && (
              <div className="flex items-center gap-2 text-xs text-orange-500">
                <AlertCircle className="w-3 h-3" />
                <span>{durationError}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="pub"
              checked={isPublished}
              onCheckedChange={(v) => setIsPublished(!!v)}
            />
            <Label htmlFor="pub">立即发布</Label>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中...
              </span>
            ) : "保存"}
          </Button>
        </form>
      </div>
    </div>
  )
}