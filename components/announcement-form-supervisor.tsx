"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export default function AnnouncementFormSupervisorSimple() {
  const supabase = createClient()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setErr(null)
    if (!title || !body) {
      setErr("标题和内容为必填")
      return
    }
    setLoading(true)
    try {
      // RPC: 내 모든 반에 자동 공지
      const { data, error } = await supabase.rpc("create_supervisor_announcement", {
        p_title: title,
        p_body: body,
      })
      if (error) throw error

      setMsg("公告已发送（已自动面向你管理的所有班级）")
      setTitle(""); setBody("")
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm">标题 *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入公告标题" />
      </div>

      <div className="space-y-2">
        <label className="text-sm">内容 *</label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="请输入公告内容" />
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}
      {msg && <p className="text-green-600 text-sm">{msg}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "发送中..." : "发送公告"}
      </Button>
      <p className="text-xs text-muted-foreground">
        提示：公告将自动发送到你所管理的所有班级。新增/变更班级后再次发送即可。
      </p>
    </form>
  )
}
