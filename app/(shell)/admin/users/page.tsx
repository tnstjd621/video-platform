// app/(shell)/admin/users/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/admin/role-badge"
import { UsersToolbar } from "@/components/admin/users-toolbar"

type SearchParams = {
  q?: string
  role?: "owner" | "administrator" | "supervisor" | "student" | ""
  page?: string
  pageSize?: string
}

export const dynamic = "force-dynamic"

export default async function UsersManagementPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()

  // 인증
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // 권한
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || (me.role !== "administrator" && me.role !== "owner")) redirect("/dashboard")

  // 쿼리 파라미터
  const q = (searchParams.q ?? "").trim()
  const role = (searchParams.role ?? "") as SearchParams["role"]
  const pageSize = Math.min(Math.max(parseInt(searchParams.pageSize ?? "12", 10) || 12, 5), 50)
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // 총 건수
  let countQuery = supabase.from("profiles").select("*", { count: "exact", head: true })
  if (q) {
    countQuery = countQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
  }
  if (role) countQuery = countQuery.eq("role", role)
  const { count = 0 } = await countQuery

  // 목록 조회
  let listQuery = supabase
    .from("profiles")
    .select("id,name,email,role,created_at")
    .order("created_at", { ascending: false })
    .range(from, to)

  if (q) listQuery = listQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
  if (role) listQuery = listQuery.eq("role", role)

  const { data: users = [] } = await listQuery

  const totalPages = Math.max(Math.ceil(count / pageSize), 1)

  return (
    <div className="space-y-6">
      {/* 헤더 + 툴바 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">用户管理</h1>
          <p className="text-sm text-muted-foreground">管理系统中的所有用户</p>
        </div>
      </div>

      <UsersToolbar
        q={q}
        role={role ?? ""}
        pageSize={pageSize}
        total={count}
      />

      <Card>
        <CardHeader>
          <CardTitle>用户列表（{count}）</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">姓名 / 邮箱</TableHead>
                  <TableHead>用户类型</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      暂无数据。请更改筛选条件或创建新用户。
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="align-middle">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[var(--brand)]/10 grid place-items-center text-xs font-semibold">
                            {initials(u.name ?? u.email ?? "U")}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{u.name ?? "（未填写）"}</div>
                            <div className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/users/${u.id}`}>编辑</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              第 {count === 0 ? 0 : from + 1}-{Math.min(to + 1, count)} 条，共 {count} 条
            </div>
            <div className="flex items-center gap-2">
              <PagerButton href={buildHref({ q, role, page: page - 1, pageSize })} disabled={page <= 1}>
                上一页
              </PagerButton>
              <span className="text-sm text-muted-foreground">第 {page} / {totalPages} 页</span>
              <PagerButton href={buildHref({ q, role, page: page + 1, pageSize })} disabled={page >= totalPages}>
                下一页
              </PagerButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- helpers ---------- */

function buildHref({
  q, role, page, pageSize,
}: { q?: string; role?: string; page: number; pageSize: number }) {
  const usp = new URLSearchParams()
  if (q) usp.set("q", q)
  if (role) usp.set("role", role)
  usp.set("page", String(Math.max(page, 1)))
  usp.set("pageSize", String(pageSize))
  return `/admin/users?${usp.toString()}`
}

function initials(name: string) {
  const s = name?.trim() ?? ""
  if (!s) return "U"
  const p = s.split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase()
}

function formatDate(v?: string) {
  try { return new Date(v ?? "").toLocaleString("zh-CN") } catch { return "—" }
}

// 간단한 앵커 버튼
function PagerButton({ href, disabled, children }: { href: string; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <Button variant="outline" size="sm" disabled>{children}</Button>
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{children}</Link>
    </Button>
  )
}
