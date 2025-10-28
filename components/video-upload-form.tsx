"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Category {
  id: string
  name: string
}

export default function VideoUploadForm({
  categories,
  uploaderId,
}: {
  categories: Category[]
  uploaderId: string
}) {
  const supabase = createClient()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title || !categoryId) {
      setError("请填写所有必填字段")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const ext = file.name.split(".").pop()
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`

      // Storage 업로드
      const { error: uploadError } = await supabase.storage.from("videos").upload(filePath, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("videos").getPublicUrl(filePath)

      // DB 기록
      const { error: insertError } = await supabase.from("videos").insert({
        title,
        url: data.publicUrl,
        category_id: categoryId,
        uploaded_by: uploaderId,
        is_published: true,
      })

      if (insertError) throw insertError

      setSuccess("视频上传成功！")
      setTitle("")
      setFile(null)
      setCategoryId("")
      router.push("/admin/videos")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">标题 *</Label>
        <Input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">分类 *</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            {(categories || []).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">视频文件 *</Label>
        <Input id="file" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
        {loading ? "上传中..." : "上传视频"}
      </Button>
    </form>
  )
}
