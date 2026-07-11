"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, UserMinus, UserCog, X } from "lucide-react"

type Supervisor = { supervisor_id: string; name: string; email: string }

export default function SupervisorAssigner({
  classroomId,
  existingSupervisors,
}: {
  classroomId: string
  existingSupervisors: Supervisor[]
}) {
  const router = useRouter()
  const [allSupervisors, setAllSupervisors] = useState<Supervisor[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [assignedQ, setAssignedQ] = useState("")
  const [allQ, setAllQ] = useState("")

  const assignedIds = useMemo(
    () => new Set(existingSupervisors.map((s) => s.supervisor_id)),
    [existingSupervisors]
  )

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingAll(true)
      try {
        const res = await fetch(`/api/admin/search-supervisors`)
        const json = await res.json()
        if (res.ok) {
          setAllSupervisors(
            (json.data || []).map((x: any) => ({
              supervisor_id: x.id,
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

  const filteredAssigned = useMemo(() => {
    const q = assignedQ.trim().toLowerCase()
    if (!q) return existingSupervisors
    return existingSupervisors.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    )
  }, [existingSupervisors, assignedQ])

  const filteredAll = useMemo(() => {
    const q = allQ.trim().toLowerCase()
    const unassigned = allSupervisors.filter((s) => !assignedIds.has(s.supervisor_id))
    if (!q) return unassigned
    return unassigned.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    )
  }, [allSupervisors, assignedIds, allQ])

  const assign = async (supervisor_id: string) => {
    setActionLoading(supervisor_id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}/supervisors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisor_id }),
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

  const remove = async (supervisor_id: string) => {
    setActionLoading(supervisor_id)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/classrooms/${classroomId}/supervisors?supervisor_id=${supervisor_id}`,
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
        {/* 좌: 배정된 班主任 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" />
              已分配的班主任
              <Badge variant="secondary" className="text-xs">
                {existingSupervisors.length}
              </Badge>
            </h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={assignedQ}
              onChange={(e) => setAssignedQ(e.target.value)}
              placeholder="搜索已分配班主任..."
              className="pl-8 h-8 text-sm"
            />
          </div>

          <div className="border rounded-xl overflow-hidden">
            {existingSupervisors.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无已分配班主任
              </div>
            ) : filteredAssigned.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                无匹配结果
              </div>
            ) : (
              <div className="divide-y max-h-72 overflow-y-auto">
                {filteredAssigned.map((s) => (
                  <div
                    key={s.supervisor_id}
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
                      onClick={() => remove(s.supervisor_id)}
                      disabled={actionLoading === s.supervisor_id}
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

        {/* 우: 추가 가능한 班主任 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-600" />
              添加班主任
              <Badge variant="secondary" className="text-xs">
                {filteredAll.length}
              </Badge>
            </h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={allQ}
              onChange={(e) => setAllQ(e.target.value)}
              placeholder="搜索班主任姓名/邮箱..."
              className="pl-8 h-8 text-sm"
            />
          </div>

          <div className="border rounded-xl overflow-hidden">
            {loadingAll ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                加载中...
              </div>
            ) : filteredAll.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {allQ ? "无匹配结果" : "所有班主任已分配"}
              </div>
            ) : (
              <div className="divide-y max-h-72 overflow-y-auto">
                {filteredAll.map((s) => (
                  <div
                    key={s.supervisor_id}
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
                      onClick={() => assign(s.supervisor_id)}
                      disabled={actionLoading === s.supervisor_id}
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