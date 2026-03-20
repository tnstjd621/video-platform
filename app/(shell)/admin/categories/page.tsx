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
import {
  FolderOpen, FolderPlus, Search, Pencil, Trash2,
  ShieldCheck, ChevronRight, Video, LayoutGrid, X
} from "lucide-react"
import { cn } from "@/lib/utils"

type Category = {
  id: string
  name: string
  parent_id: string | null
  videos?: { id: string; title: string }[]
}

export default function CategoriesPage() {
  const supabase = createClient()

  const [all, setAll] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [parentFilter, setParentFilter] = useState<"all" | "root">("all")
  const [renameOpen, setRenameOpen] = useState(false)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select(`id, name, parent_id, videos ( id, title )`)
      .order("name", { ascending: true })
    if (!error) setAll((data ?? []) as unknown as Category[])
  }

  useEffect(() => { fetchCategories() }, [])

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
        (p) => p.name.includes(k) || (childrenMap.get(p.id)?.some((s) => s.name.includes(k)) ?? false)
      )
    }
    return list
  }, [parents, childrenMap, q, parentFilter])

  // 통계
  const totalVideos = useMemo(() =>
    all.reduce((acc, c) => acc + (c.videos?.length ?? 0), 0), [all])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddCategory = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      parent_id: parentId,
    })
    if (!error) { setName(""); setParentId(null); await fetchCategories() }
    setLoading(false)
  }

  const handleDeleteCategory = async (id: string) => {
    const hasChildren = (childrenMap.get(id)?.length ?? 0) > 0
    const hasVideos =
      (all.find((c) => c.id === id)?.videos?.length ?? 0) > 0 ||
      [...(childrenMap.get(id) ?? [])].some((s) => (s.videos?.length ?? 0) > 0)
    const msg = hasChildren || hasVideos
      ? "该分类或其子分类下存在内容，删除后将无法恢复。确定继续删除吗？"
      : "确定要删除这个分类吗？"
    if (!confirm(msg)) return
    const { error } = await supabase.from("categories").delete().eq("id", id)
    if (!error) await fetchCategories()
  }

  const openRename = (cat: Category) => {
    setRenaming({ id: cat.id, name: cat.name })
    setRenameValue(cat.name)
    setRenameOpen(true)
  }

  const submitRename = async () => {
    if (!renaming) return
    const newName = renameValue.trim()
    if (!newName || newName === renaming.name) { setRenameOpen(false); return }
    const { error } = await supabase.from("categories").update({ name: newName }).eq("id", renaming.id)
    if (!error) { setRenameOpen(false); setRenaming(null); await fetchCategories() }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-primary" />
              分类管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">维护课程大类与子分类，并管理访问权限</p>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">大分类</p>
              <p className="text-2xl font-bold">{parents.length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">子分类</p>
              <p className="text-2xl font-bold">{all.filter(c => c.parent_id).length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">视频总数</p>
              <p className="text-2xl font-bold">{totalVideos}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌: 추가 폼 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderPlus className="w-4 h-4" />
                  添加分类
                </CardTitle>
                <CardDescription>支持创建大分类或子分类</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">分类名称</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：旧约 / 初级班"
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">上级分类（可选）</Label>
                  <Select
                    value={parentId ?? "none"}
                    onValueChange={(val) => setParentId(val === "none" ? null : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="无上级分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无上级分类</SelectItem>
                      {parents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddCategory}
                  disabled={loading || !name.trim()}
                  className="w-full"
                >
                  {loading ? "添加中…" : "添加分类"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 우: 분류 목록 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 검색/필터 */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索分类名称…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9"
                />
              </div>
              {q && (
                <Button variant="ghost" size="icon" onClick={() => setQ("")}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* 분류 목록 */}
            {filteredParents.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground text-sm">
                  暂无分类
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredParents.map((cat) => {
                  const subs = childrenMap.get(cat.id) ?? []
                  const parentVideoCount = cat.videos?.length ?? 0
                  const subsVideoCount = subs.reduce((acc, s) => acc + (s.videos?.length ?? 0), 0)
                  const totalCount = parentVideoCount + subsVideoCount
                  const isExpanded = expandedIds.has(cat.id)

                  return (
                    <Card key={cat.id} className="overflow-hidden">
                      {/* 대분류 헤더 */}
                      <div className="px-5 py-4 flex items-center gap-3">
                        {/* 펼치기 버튼 */}
                        <button
                          onClick={() => toggleExpand(cat.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronRight className={cn(
                            "w-4 h-4 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        </button>

                        {/* 분류명 + 배지 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{cat.name}</span>
                            <Badge variant="secondary" className="text-xs gap-1">
                              <FolderOpen className="w-3 h-3" />
                              子类 {subs.length}
                            </Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              <Video className="w-3 h-3" />
                              视频 {totalCount}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">父级分类</p>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button asChild size="sm" variant="outline" className="gap-1.5 h-8">
                            <Link href={`/admin/categories/${cat.id}/access`}>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              管理权限
                            </Link>
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="gap-1.5 h-8"
                            onClick={() => openRename(cat)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            重命名
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </Button>
                        </div>
                      </div>

                      {/* 하위 분류 (펼쳐질 때) */}
                      {isExpanded && (
                        <div className="border-t bg-muted/20 px-5 py-4">
                          {subs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">暂无子分类</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {subs.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="rounded-lg border bg-background px-4 py-3 flex items-center justify-between"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{sub.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      视频 {sub.videos?.length ?? 0}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <Button
                                      size="sm" variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => openRename(sub)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="sm" variant="ghost"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteCategory(sub.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 이름 변경 다이얼로그 */}
      <Dialog open={renameOpen} onOpenChange={(o) => !o && setRenameOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>新的名称</Label>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRename()}
              autoFocus
            />
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={submitRename}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}