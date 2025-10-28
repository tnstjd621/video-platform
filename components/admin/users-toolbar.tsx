"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Plus, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"

export function UsersToolbar({
  q,
  role,              // "all" | "owner" | "administrator" | "supervisor" | "student"
  pageSize,
  total,
}: {
  q: string
  role: "all" | "owner" | "administrator" | "supervisor" | "student"
  pageSize: number
  total: number
}) {
  const router = useRouter()
  const search = useSearchParams()
  const [keyword, setKeyword] = useState(q)

  useEffect(() => setKeyword(q), [q])

  const update = (patch: Record<string, string | number | undefined>) => {
    const usp = new URLSearchParams(search?.toString())
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "all") usp.delete(k)   // ← all은 쿼리에서 제거
      else usp.set(k, String(v))
    })
    usp.delete("page") // 필터 변경 시 1페이지로
    router.push(`/admin/users?${usp.toString()}`)
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div className="flex items-center gap-2">
        <Input
          placeholder="搜索姓名或邮箱…"
          className="w-[220px]"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && update({ q: keyword })}
        />
        <Button variant="outline" onClick={() => update({ q: keyword })}>搜索</Button>

        {/* ✅ 빈 문자열 대신 'all' 사용 */}
        <Select value={role} onValueChange={(v) => update({ role: v })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="按用户类型筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="owner">系统所有者</SelectItem>
            <SelectItem value="administrator">管理员</SelectItem>
            <SelectItem value="supervisor">班主任</SelectItem>
            <SelectItem value="student">学生</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(v) => update({ pageSize: v })}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="每页数量" /></SelectTrigger>
          <SelectContent>
            {[12, 24, 36, 48].map(n => <SelectItem key={n} value={String(n)}>{n} / 页</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="ghost" onClick={() => update({ q: "", role: "all", pageSize })} className="gap-1">
          <RefreshCw className="h-4 w-4" /> 重置
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground hidden md:block">共 {total} 个用户</div>
        <Button asChild className="gap-1">
          <Link href="/admin/create-user"><Plus className="h-4 w-4" /> 创建账户</Link>
        </Button>
      </div>
    </div>
  )
}
