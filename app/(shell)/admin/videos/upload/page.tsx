"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, AlertCircle, Youtube, ArrowLeft, Upload } from "lucide-react"
import Link from "next/link"

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

  const handleUrlBlur = async () => {
    if (!youtubeUrl || !isYouTubeUrl(youtubeUrl)) return
    if (duration !== null) return

    setDurationLoading(true)
    setDurationError(null)
    setDuration(null)

    try {
      const res = await fetch(`/api/youtube-duration?url=${encodeURIComponent(youtubeUrl)}`)
      const json = await res.json()
      if (!res.ok || json.error) {
        setDurationError("无法获取视频时长，保存后将自动更新。")
      } else {
        setDuration(json.duration)
      }
    } catch {
      setDurationError("网络错误，保存后将自动更新。")
    } finally {
      setDurationLoading(false)
    }
  }

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
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Upload className="w-6 h-6 text-primary" />
              登记 YouTube 视频
            </h1>
            <p className="text-sm text-muted-foreground mt-1">添加新的课程视频内容</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/videos">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回列表
            </Link>
          </Button>
        </div>

        {/* 폼 카드 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">视频信息</CardTitle>
            <CardDescription>填写视频的基本信息并粘贴 YouTube 链接</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* 제목 */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium">
                  视频标题 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入视频标题"
                />
              </div>

              {/* 카테고리 */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  分类 <span className="text-destructive">*</span>
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* YouTube URL */}
              <div className="space-y-1.5">
                <Label htmlFor="yt" className="text-sm font-medium">
                  YouTube 链接 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  <Input
                    id="yt"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=XXXX 或 https://youtu.be/XXXX"
                    value={youtubeUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onBlur={handleUrlBlur}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  系统会自动识别并以嵌入方式播放，同时记录学习进度。
                </p>

                {/* duration 상태 */}
                {durationLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    <span>正在获取视频时长...</span>
                  </div>
                )}
                {duration !== null && !durationLoading && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>视频时长：{formatTime(duration)}</span>
                  </div>
                )}
                {durationError && !durationLoading && (
                  <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{durationError}</span>
                  </div>
                )}
              </div>

              {/* 즉시 발행 */}
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <Checkbox
                  id="pub"
                  checked={isPublished}
                  onCheckedChange={(v) => setIsPublished(!!v)}
                />
                <div>
                  <Label htmlFor="pub" className="text-sm font-medium cursor-pointer">
                    立即发布
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    勾选后学生可立即看到此视频
                  </p>
                </div>
              </div>

              {/* 에러/성공 */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      提交中...
                    </span>
                  ) : "保存视频"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  取消
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}