"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Supervisor = { id: string; name: string; email: string }

const NONE = "__none__" as const

export default function ClassroomCreateForm({
  supervisors,
  mode = "create",
  defaultValues,
}: {
  supervisors: Supervisor[]
  mode?: "create" | "edit"
  defaultValues?: { id: string; name: string; supervisor_id: string | null }
}) {
  const supabase = createClient()
  const router = useRouter()

  const [name, setName] = useState(defaultValues?.name || "")
  // string | null 로 관리
  const [supervisorId, setSupervisorId] = useState<string | null>(defaultValues?.supervisor_id ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const payload = {
        name,
        supervisor_id: supervisorId || null, // null 저장
      }

      if (mode === "create") {
        const { error: insertError } = await supabase.from("classrooms").insert(payload)
        if (insertError) throw insertError
        setSuccess("班级创建成功")
        setName("")
        setSupervisorId(null)
        router.refresh()
      } else {
        if (!defaultValues?.id) throw new Error("缺少班级ID")
        const { error: updateError } = await supabase.from("classrooms").update(payload).eq("id", defaultValues.id)
        if (updateError) throw updateError
        setSuccess("已更新班级信息")
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Select onValueChange 핸들러: 센티넬 값이면 null 로 변환
  const onChangeSupervisor = (val: string) => {
    if (val === NONE) setSupervisorId(null)
    else setSupervisorId(val)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">班级名称 *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：高一（1）班" required />
      </div>

      <div className="space-y-2">
        <Label>监督者（可选）</Label>
        <Select
          // Radix는 undefined 일 때 placeholder가 보임
          value={supervisorId ?? undefined}
          onValueChange={onChangeSupervisor}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择监督者（可不选）" />
          </SelectTrigger>
          <SelectContent>
            {/* 빈 문자열 대신 센티넬 값 사용 */}
            <SelectItem value={NONE}>（不指定）</SelectItem>
            {supervisors.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}（{s.email}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "处理中..." : mode === "create" ? "创建班级" : "保存修改"}
      </Button>
    </form>
  )
}
