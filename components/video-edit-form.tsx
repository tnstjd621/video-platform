"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface VideoEditFormProps {
  video: {
    id: string
    title: string
    description: string | null
    thumbnail_url: string | null
    category_id: string | null
    duration: number | null
    is_published: boolean
  }
  categories: Array<{ id: string; name: string }>
}

export function VideoEditForm({ video, categories }: VideoEditFormProps) {
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description || "")
  const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnail_url || "")
  const [categoryId, setCategoryId] = useState(video.category_id || "")
  const [duration, setDuration] = useState(video.duration?.toString() || "")
  const [isPublished, setIsPublished] = useState(video.is_published)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("videos")
        .update({
          title,
          description: description || null,
          thumbnail_url: thumbnailUrl || null,
          category_id: categoryId || null,
          duration: duration ? Number.parseInt(duration) : null,
          is_published: isPublished,
          updated_at: new Date().toISOString(),
        })
        .eq("id", video.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/admin/videos")
      }, 1500)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "更新失败")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">视频标题 *</Label>
        <Input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">视频描述</Label>
        <Textarea
          id="description"
          placeholder="描述视频内容..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnailUrl">缩略图链接</Label>
        <Input
          id="thumbnailUrl"
          type="url"
          placeholder="https://example.com/thumbnail.jpg"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">分类</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">时长（秒）</Label>
        <Input
          id="duration"
          type="number"
          placeholder="例如：300"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="published" checked={isPublished} onCheckedChange={(checked) => setIsPublished(!!checked)} />
        <Label htmlFor="published">发布视频</Label>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">视频信息更新成功！正在返回视频列表...</div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "更新中..." : "更新视频"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
