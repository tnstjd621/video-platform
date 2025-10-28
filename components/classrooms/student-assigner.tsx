"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

type Existing = { student_id: string; name: string; email: string }

export default function StudentAssigner({
  classroomId,
  existingStudents,
}: {
  classroomId: string
  existingStudents: Existing[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Existing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/search-students?q=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "搜索失败")
      const mapped: Existing[] = (json.data || []).map((x: any) => ({
        student_id: x.id,
        name: x.name,
        email: x.email,
      }))
      setResults(mapped)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const assign = async (student_id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "分配失败")
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (student_id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}/students?student_id=${student_id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "移除失败")
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 已分配 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">已分配的学生</h3>
          <div className="space-y-2">
            {existingStudents.length === 0 && <div className="text-sm text-muted-foreground">暂无学生</div>}
            {existingStudents.map((s) => (
              <div key={s.student_id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-muted-foreground">{s.email}</div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => remove(s.student_id)} disabled={loading}>
                  移除
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 搜索并分配 */}
      <div className="space-y-3">
        <Label htmlFor="query">搜索学生（姓名/邮箱）</Label>
        <div className="flex gap-2">
          <Input id="query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="输入关键词" />
          <Button onClick={search} disabled={loading || !query.trim()}>
            {loading ? "搜索中..." : "搜索"}
          </Button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.student_id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <div className="text-sm">
                <div className="font-medium">{r.name}</div>
                <div className="text-muted-foreground">{r.email}</div>
              </div>
              <Button size="sm" onClick={() => assign(r.student_id)} disabled={loading}>
                分配到本班
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
