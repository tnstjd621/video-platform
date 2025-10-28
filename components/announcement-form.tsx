"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function AnnouncementForm() {
  const supabase = createClient()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState<"supervisors"|"students"|"both">("both")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    if (!title || !body) {
      setErr("标题和内容为必填")
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("未登录")

      const { error } = await supabase.from("announcements").insert({
        title,
        body,
        audience,
        created_by: user.id,
      })
      if (error) throw error
      setMsg("公告已发送")
      setTitle("")
      setBody("")
      setAudience("both")
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm">标题 *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入公告标题" />
      </div>

      <div className="space-y-2">
        <label className="text-sm">内容 *</label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="请输入公告内容" />
      </div>

      <div className="space-y-2">
        <label className="text-sm">发送对象 *</label>
        <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="选择对象" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="supervisors">仅监督者 (supervisors)</SelectItem>
            <SelectItem value="students">仅学生 (students)</SelectItem>
            <SelectItem value="both">监督者 + 学生 (both)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-green-600">{msg}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "发送中..." : "发送公告"}
      </Button>
    </form>
  )
}
