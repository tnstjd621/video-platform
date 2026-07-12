"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

type Classroom = { id: string; name: string }

export default function AnnouncementFormSupervisorSimple() {
  const supabase = createClient()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loadingClassrooms, setLoadingClassrooms] = useState(true)

  useEffect(() => {
    const fetchClassrooms = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: csRows } = await supabase
        .from("classroom_supervisors")
        .select("classroom_id")
        .eq("supervisor_id", user.id)

      const ids = (csRows ?? []).map((r) => r.classroom_id)
      if (ids.length === 0) {
        setClassrooms([])
        setLoadingClassrooms(false)
        return
      }

      const { data: rooms } = await supabase
        .from("classrooms")
        .select("id, name")
        .in("id", ids)
        .order("name")

      setClassrooms(rooms ?? [])
      setLoadingClassrooms(false)
    }
    fetchClassrooms()
  }, [])

  const toggleClassroom = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((cid) => cid !== id)
    )
  }

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? classrooms.map((c) => c.id) : [])
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setErr(null)
    if (!title || !body) {
      setErr("标题和内容为必填")
      return
    }
    if (selectedIds.length === 0) {
      setErr("请至少选择一个班级")
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.rpc("create_supervisor_announcement", {
        p_title: title,
        p_body: body,
        p_classroom_ids: selectedIds,
      })
      if (error) throw error

      setMsg("公告已发送")
      setTitle(""); setBody(""); setSelectedIds([])
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm">发送到的班级 *</label>
          {classrooms.length > 0 && (
            <button
              type="button"
              onClick={() => toggleAll(selectedIds.length !== classrooms.length)}
              className="text-xs text-primary hover:underline"
            >
              {selectedIds.length === classrooms.length ? "取消全选" : "全选"}
            </button>
          )}
        </div>
        <div className="rounded-md border max-h-48 overflow-y-auto p-2 space-y-1">
          {loadingClassrooms ? (
            <p className="text-xs text-muted-foreground px-2 py-1">加载中...</p>
          ) : classrooms.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">暂无管理的班级</p>
          ) : (
            classrooms.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selectedIds.includes(c.id)}
                  onCheckedChange={(checked) => toggleClassroom(c.id, checked === true)}
                />
                <span>{c.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}
      {msg && <p className="text-green-600 text-sm">{msg}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "发送中..." : "发送公告"}
      </Button>
    </form>
  )
}