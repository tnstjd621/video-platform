"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

type Supervisor = { id: string; name: string; email: string }

export default function ClassroomCreateForm({
  supervisors,
  mode = "create",
  defaultValues,
}: {
  supervisors: Supervisor[]
  mode?: "create" | "edit"
  defaultValues?: { id: string; name: string; supervisorIds: string[] }
}) {
  const supabase = createClient()
  const router = useRouter()

  const [name, setName] = useState(defaultValues?.name || "")
  const [supervisorIds, setSupervisorIds] = useState<string[]>(defaultValues?.supervisorIds ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const toggleSupervisor = (id: string, checked: boolean) => {
    setSupervisorIds((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (mode === "create") {
        const { data: newClassroom, error: insertError } = await supabase
          .from("classrooms")
          .insert({ name })
          .select("id")
          .single()
        if (insertError) throw insertError

        if (supervisorIds.length > 0) {
          const rows = supervisorIds.map((sid) => ({
            classroom_id: newClassroom.id,
            supervisor_id: sid,
          }))
          const { error: csError } = await supabase.from("classroom_supervisors").insert(rows)
          if (csError) throw csError
        }

        setSuccess("班级创建成功")
        setName("")
        setSupervisorIds([])
        router.refresh()
      } else {
        if (!defaultValues?.id) throw new Error("缺少班级ID")

        const { error: updateError } = await supabase
          .from("classrooms")
          .update({ name })
          .eq("id", defaultValues.id)
        if (updateError) throw updateError

        // 기존 목록과 비교하여 추가/삭제분 계산
        const original = defaultValues.supervisorIds
        const toAdd = supervisorIds.filter((id) => !original.includes(id))
        const toRemove = original.filter((id) => !supervisorIds.includes(id))

        if (toAdd.length > 0) {
          const rows = toAdd.map((sid) => ({
            classroom_id: defaultValues.id,
            supervisor_id: sid,
          }))
          const { error: addError } = await supabase.from("classroom_supervisors").insert(rows)
          if (addError) throw addError
        }

        if (toRemove.length > 0) {
          const { error: removeError } = await supabase
            .from("classroom_supervisors")
            .delete()
            .eq("classroom_id", defaultValues.id)
            .in("supervisor_id", toRemove)
          if (removeError) throw removeError
        }

        setSuccess("已更新班级信息")
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">班级名称 *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：高一（1）班" required />
      </div>

      <div className="space-y-2">
        <Label>班主任（可多选）</Label>
        <div className="rounded-md border max-h-48 overflow-y-auto p-2 space-y-1">
          {supervisors.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">暂无可选班主任</p>
          ) : (
            supervisors.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={supervisorIds.includes(s.id)}
                  onCheckedChange={(checked) => toggleSupervisor(s.id, checked === true)}
                />
                <span>{s.name}（{s.email}）</span>
              </label>
            ))
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "处理中..." : mode === "create" ? "创建班级" : "保存修改"}
      </Button>
    </form>
  )
}