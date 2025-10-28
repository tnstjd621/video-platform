// components/courses-category-picker.tsx
"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function CategoryPickerClient({
  categories,
  active,
  q,
  sort,
}: {
  categories: { id: string; name: string }[]
  active: string
  q: string
  sort: string
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")

  const list = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return f ? categories.filter((c) => c.name.toLowerCase().includes(f)) : categories
  }, [categories, filter])

  return (
    <div className="w-full md:w-auto">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          选择分类
        </Button>
        <Badge
          variant="outline"
          className={cn("hidden md:inline-flex",
            active !== "all" && "bg-[var(--brand)] text-white border-transparent")}
        >
          {categories.find((c) => c.id === active)?.name ?? "全部"}
        </Badge>
      </div>

      {open && (
        <div className="mt-2 rounded-lg border bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜索分类…"
              className="h-9"
            />
            <Button variant="ghost" onClick={() => setFilter("")}>清除</Button>
          </div>

          <div className="max-h-56 overflow-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {list.map((c) => {
                const href = `/courses?${new URLSearchParams({ q, cat: c.id, sort }).toString()}`
                const isActive = c.id === active
                return (
                  <Link key={c.id} href={href} onClick={() => setOpen(false)}>
                    <Badge
                      variant={isActive ? "default" : "outline"}
                      className={cn(
                        "w-full justify-center cursor-pointer",
                        isActive && "bg-[var(--brand)] hover:bg-[var(--brand-hover)]"
                      )}
                    >
                      {c.name}
                    </Badge>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="mt-3 text-right">
            <Button variant="outline" onClick={() => setOpen(false)}>收起</Button>
          </div>
        </div>
      )}
    </div>
  )
}
