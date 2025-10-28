"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

type Category = { id: string; name: string }

export function VideosToolbar({
  q,
  status,           // "all" | "published" | "draft"
  categoryId,       // category_id or "all"
  pageSize,
  categories,
  total,
}: {
  q: string
  status: "all" | "published" | "draft"
  categoryId: string
  pageSize: number
  categories: Category[]
  total: number
}) {
  const router = useRouter()
  const search = useSearchParams()

  const update = (patch: Record<string, string | number | undefined>) => {
    const usp = new URLSearchParams(search?.toString())
    Object.entries(patch).forEach(([k, v]) => {
      // "all" 또는 빈 값은 파라미터에서 제거
      if (v === undefined || v === "" || v === "all") usp.delete(k)
      else usp.set(k, String(v))
    })
    usp.delete("page") // 필터 변경 시 1페이지로
    router.push(`/admin/videos?${usp.toString()}`)
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Input
          defaultValue={q}
          placeholder="搜索标题…"
          className="w-[220px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value })
          }}
        />
        <Button variant="outline" onClick={() => update({ q: (document.querySelector<HTMLInputElement>('input[placeholder="搜索标题…"]')?.value ?? "") })}>
          搜索
        </Button>

        {/* 状态 */}
        <Select value={status} onValueChange={(v) => update({ status: v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="按状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
          </SelectContent>
        </Select>

        {/* 分类 */}
        <Select value={categoryId === "all" ? "all" : categoryId} onValueChange={(v) => update({ category: v })}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="按分类筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 每页数量 */}
        <Select value={String(pageSize)} onValueChange={(v) => update({ pageSize: v })}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="每页数量" /></SelectTrigger>
          <SelectContent>
            {[12, 24, 36, 48].map(n => <SelectItem key={n} value={String(n)}>{n} / 页</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">共 {total} 个视频</div>
    </div>
  )
}
