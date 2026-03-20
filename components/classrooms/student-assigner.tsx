"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, UserMinus, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Student = { student_id: string; name: string; email: string }

export default function StudentAssigner({
  classroomId,
  existingStudents,
}: {
  classroomId: string
  existingStudents: Student[]
}) {
  const router = useRouter()
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 검색 쿼리 (배정된 학생 / 전체 학생 각각)
  const [assignedQ, setAssignedQ] = useState("")
  const [allQ, setAllQ] = useState("")

  // 현재 배정된 학생 ID set
  const assignedIds = useMemo(
    () => new Set(existingStudents.map((s) => s.student_id)),
    [existingStudents]
  )

  // 전체 학생 목록 로드
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingAll(true)
      try {
        const res = await fetch(`/api/admin/search-students?q=`)
        const json = await res.json()
        if (res.ok) {
          setAllStudents(
            (json.data || []).map((x: any) => ({
              student_id: x.id,
              name: x.name,
              email: x.email,
            }))
          )
        }
      } catch {}
      setLoadingAll(false)
    }
    fetchAll()
  }, [])

  // 필터링
  const filteredAssigned = useMemo(() => {
    const q = assignedQ.trim().toLowerCase()
    if (!q) return existingStudents
    return existingStudents.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    )
  }, [existingStudents, assignedQ])

  const filteredAll = useMemo(() => {
    const q = allQ.trim().toLowerCase()
    const unassigned = allStudents.filter((s) => !assignedIds.has(s.student_id))
    if (!q) return unassigned
    return unassigned.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    )
  }, [allStudents, assignedIds, allQ])

  const assign = async (student_id: string) => {
    setActionLoading(student_id)
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
      setActionLoading(null)
    }
  }

  const remove = async (student_id: string) => {
    setActionLoading(student_id)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/classrooms/${classroomId}/students?student_id=${student_id}`,
        { method: "DELETE" }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "移除失败")
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 좌: 배정된 학생 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              已分配的学生
              <Badge variant="secondary" className="text-xs">
                {existingStudents.length}
              </Badge>
            </h3>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={assignedQ}
              onChange={(e) => setAssignedQ(e.target.value)}
              placeholder="搜索已分配学生..."
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* 목록 */}
          <div className="border rounded-xl overflow-hidden">
            {existingStudents.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无已分配学生
              </div>
            ) : filteredAssigned.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                无匹配结果
              </div>
            ) : (
              <div className="divide-y max-h-72 overflow-y-auto">
                {filteredAssigned.map((s) => (
                  <div
                    key={s.student_id}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {s.name?.[0] ?? "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => remove(s.student_id)}
                      disabled={actionLoading === s.student_id}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      移除
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우: 추가 가능한 학생 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-600" />
              添加学生
              <Badge variant="secondary" className="text-xs">
                {filteredAll.length}
              </Badge>
            </h3>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={allQ}
              onChange={(e) => setAllQ(e.target.value)}
              placeholder="搜索学生姓名/邮箱..."
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* 목록 */}
          <div className="border rounded-xl overflow-hidden">
            {loadingAll ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                加载中...
              </div>
            ) : filteredAll.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {allQ ? "无匹配结果" : "所有学生已分配"}
              </div>
            ) : (
              <div className="divide-y max-h-72 overflow-y-auto">
                {filteredAll.map((s) => (
                  <div
                    key={s.student_id}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-green-600">
                          {s.name?.[0] ?? "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-green-600 hover:text-green-600 hover:bg-green-500/10 shrink-0"
                      onClick={() => assign(s.student_id)}
                      disabled={actionLoading === s.student_id}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      添加
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}