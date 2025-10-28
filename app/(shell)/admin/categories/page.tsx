"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Category = {
  id: string
  name: string
  parent_id: string | null
  videos?: { id: string; title: string }[]
}

export default function CategoriesPage() {
  const supabase = createClient()
  const router = useRouter()

  // 전체 목록
  const [all, setAll] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  // 추가 폼
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState<string | null>(null)

  // 필터
  const [q, setQ] = useState("")
  const [parentFilter, setParentFilter] = useState<"all" | "root">("all")

  // 이름 변경
  const [renameOpen, setRenameOpen] = useState(false)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // 목록 조회
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        parent_id,
        videos ( id, title )
      `) // ← 관계 이름 그대로 사용 (FK: videos.category_id → categories.id)
      .order("name", { ascending: true })

    if (error) {
      console.error("[categories] select error:", error)
      setAll([])
      return
    }
    setAll((data ?? []) as unknown as Category[])
  }

  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 파생 데이터
  const parents = useMemo(() => all.filter((c) => !c.parent_id), [all])
  const childrenMap = useMemo(() => {
    const m = new Map<string, Category[]>()
    all.forEach((c) => {
      if (c.parent_id) {
        const arr = m.get(c.parent_id) ?? []
        arr.push(c)
        m.set(c.parent_id, arr)
      }
    })
    return m
  }, [all])

  const filteredParents = useMemo(() => {
    let list = parents
    if (q.trim()) {
      const k = q.trim()
      list = list.filter(
        (p) => p.name.includes(k) || (childrenMap.get(p.id)?.some((s) => s.name.includes(k)) ?? false),
      )
    }
    if (parentFilter === "root") {
      // 대분류만 — 이미 parents라 추가 필터 없음(확장 시 남겨둠)
      list = list
    }
    return list
  }, [parents, childrenMap, q, parentFilter])

  // 추가
  const handleAddCategory = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      parent_id: parentId, // null이면 대분류
    })
    if (!error) {
      setName("")
      setParentId(null)
      await fetchCategories()
    }
    setLoading(false)
  }

  // 삭제 (간단 확인 — 실제로는 FK/트리거로 보호 권장)
  const handleDeleteCategory = async (id: string) => {
    const hasChildren = (childrenMap.get(id)?.length ?? 0) > 0
    const hasVideos =
      (all.find((c) => c.id === id)?.videos?.length ?? 0) > 0 ||
      [...(childrenMap.get(id) ?? [])].some((s) => (s.videos?.length ?? 0) > 0)

    const msg =
      hasChildren || hasVideos
        ? "该分类或其子分类下存在内容，删除后将无法恢复。确定继续删除吗？"
        : "确定要删除这个分类吗？"

    if (!confirm(msg)) return
    const { error } = await supabase.from("categories").delete().eq("id", id)
    if (!error) await fetchCategories()
  }

  // 이름 변경
  const openRename = (cat: Category) => {
    setRenaming({ id: cat.id, name: cat.name })
    setRenameValue(cat.name)
    setRenameOpen(true)
  }
  const submitRename = async () => {
    if (!renaming) return
    const newName = renameValue.trim()
    if (!newName || newName === renaming.name) {
      setRenameOpen(false)
      return
    }
    const { error } = await supabase.from("categories").update({ name: newName }).eq("id", renaming.id)
    if (!error) {
      setRenameOpen(false)
      setRenaming(null)
      await fetchCategories()
    }
  }

  return (
    <div className="space-y-6">
      {/* 상단 툴바 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">分类管理</h1>
          <p className="text-sm text-muted-foreground">维护课程大类与子分类，并管理访问权限</p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="搜索分类名称…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-[220px]"
          />
          <Select value={parentFilter} onValueChange={(v: "all" | "root") => setParentFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="父级筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部父级</SelectItem>
              <SelectItem value="root">仅大分类</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setQ(""); setParentFilter("all") }}>
            重置
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌: 추가 폼 */}
        <Card className="lg:col-span-1 h-max">
          <CardHeader className="pb-0">
            <CardTitle>添加分类</CardTitle>
            <CardDescription>支持创建大分类或子分类</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 mt-4">
            <div className="space-y-2">
              <Label>分类名称</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：旧约 / 初级班"
              />
            </div>

            <div className="space-y-2">
              <Label>上级分类（可选）</Label>
              <Select
                value={parentId ?? "none"}                   // ← 빈 문자열 금지
                onValueChange={(val) => setParentId(val === "none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="无上级分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无上级分类</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddCategory}
              disabled={loading || !name.trim()}
              className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)]"
            >
              {loading ? "添加中…" : "添加分类"}
            </Button>
          </CardContent>
        </Card>

        {/* 우: 리스트 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle>分类列表</CardTitle>
            <CardDescription>点击“管理权限”可配置学生访问</CardDescription>
          </CardHeader>
          <CardContent className="mt-4 space-y-6">
            {filteredParents.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">暂无分类</div>
            ) : (
              filteredParents.map((cat) => {
                const subs = childrenMap.get(cat.id) ?? []
                const parentVideoCount = cat.videos?.length ?? 0
                const subsVideoCount = subs.reduce((acc, s) => acc + (s.videos?.length ?? 0), 0)

                return (
                  <div key={cat.id} className="rounded-lg border">
                    {/* 대분류 행 */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base truncate">{cat.name}</CardTitle>
                          <Badge variant="secondary">子类 {subs.length}</Badge>
                          <Badge variant="outline">视频 {parentVideoCount + subsVideoCount}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          父级分类 · 可分配访问权限给学生或班级
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/categories/${cat.id}/access`}>管理权限</Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openRename(cat)}>
                          重命名
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(cat.id)}>
                          删除
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* 하위 분류 */}
                    <div className="p-4">
                      {subs.length === 0 ? (
                        <div className="text-sm text-muted-foreground">暂无子分类</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {subs.map((sub) => (
                            <div key={sub.id} className="rounded-md border p-3 flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{sub.name}</div>
                                <div className="text-xs text-muted-foreground">视频 {sub.videos?.length ?? 0}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => openRename(sub)}>
                                  重命名
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(sub.id)}>
                                  删除
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* 이름 변경 다이얼로그 */}
      <Dialog open={renameOpen} onOpenChange={(o) => !o && setRenameOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>新的名称</Label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={submitRename} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
