"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

type Category = { id: string; name: string }

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

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.from("categories").select("id,name").order("name")
      setCategories(data || [])
    }
    run()
  }, [supabase])

  const isYouTubeUrl = (u: string) => /(youtube\.com|youtu\.be)\//i.test(u)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSuccess(null)
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
        url: youtubeUrl.trim(),   // ★ 유튜브 링크만 저장
        category_id: categoryId,
        uploaded_by: user.id,
        is_published: isPublished,
      })
      if (insertError) throw insertError

      setSuccess("视频登记成功！")
      setTitle(""); setYoutubeUrl(""); setCategoryId("")
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
            <Input id="title" value={title} onChange={(e)=>setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>分类 *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
              onChange={(e)=>setYoutubeUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">系统会自动识别并以嵌入方式播放，同时记录学习进度。</p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="pub" checked={isPublished} onCheckedChange={(v)=>setIsPublished(!!v)} />
            <Label htmlFor="pub">立即发布</Label>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "提交中..." : "保存"}
          </Button>
        </form>
      </div>
    </div>
  )
}
