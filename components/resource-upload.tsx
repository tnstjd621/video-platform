"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ResourceUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setError(null)

    try {
      const ext = file.name.split(".").pop()
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: storageError } = await supabase.storage
        .from("resources")
        .upload(path, file)

      if (storageError) throw storageError

      const { data: { publicUrl } } = supabase.storage
        .from("resources")
        .getPublicUrl(path)

      const { error: dbError } = await supabase.from("resources").insert({
        name: file.name,
        description: description.trim() || null,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      })

      if (dbError) throw dbError

      setFile(null)
      setDescription("")
      if (inputRef.current) inputRef.current.value = ""
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
      <p className="text-sm font-semibold">上传新资料</p>

      <div className="space-y-1.5">
        <Label className="text-sm">文件</Label>
        <Input
          ref={inputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">说明（可选）</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="文件简短说明"
          className="text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full"
        size="sm"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />上传中…</>
        ) : (
          <><Upload className="w-4 h-4 mr-2" />上传</>
        )}
      </Button>
    </div>
  )
}