// app/(shell)/admin/users/page.tsx
import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/admin/role-badge"
import { UsersToolbar } from "@/components/admin/users-toolbar"
import { Users, ShieldCheck, GraduationCap, UserCog } from "lucide-react"

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
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || (me.role !== "administrator" && me.role !== "owner")) redirect("/dashboard")

  // ✅ Next.js 15: await로 unwrap
  const {
    q: rawQ,
    role: rawRole,
    page: rawPage,
    pageSize: rawPageSize,
  } = await searchParams

  const q = (rawQ ?? "").trim()
  const role = (rawRole ?? "") as SearchParams["role"]
  const pageSize = Math.min(Math.max(parseInt(rawPageSize ?? "12", 10) || 12, 5), 50)
  const page = Math.max(parseInt(rawPage ?? "1", 10) || 1, 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // 총 건수
  let countQuery = supabase.from("profiles").select("*", { count: "exact", head: true })
  if (q) countQuery = countQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
  if (role) countQuery = countQuery.eq("role", role)
  const { count = 0 } = await countQuery

  // 역할별 통계
  const { data: roleCounts } = await supabase
    .from("profiles")
    .select("role")

  const roleStats = {
    total: roleCounts?.length ?? 0,
    student: roleCounts?.filter(r => r.role === "student").length ?? 0,
    supervisor: roleCounts?.filter(r => r.role === "supervisor").length ?? 0,
    administrator: roleCounts?.filter(r => r.role === "administrator" || r.role === "owner").length ?? 0,
  }

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              用户管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">管理系统中的所有用户</p>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">总用户数</p>
              <p className="text-2xl font-bold">{roleStats.total}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">学生</p>
              <p className="text-2xl font-bold">{roleStats.student}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <UserCog className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">班级管理员</p>
              <p className="text-2xl font-bold">{roleStats.supervisor}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">管理员</p>
              <p className="text-2xl font-bold">{roleStats.administrator}</p>
            </div>
          </div>
        </div>

        {/* 툴바 */}
        <Suspense fallback={null}>
          <UsersToolbar q={q} role={role ?? ""} pageSize={pageSize} total={count} />
        </Suspense>

        {/* 테이블 */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <p className="text-sm font-medium">
              用户列表
              <span className="ml-2 text-muted-foreground font-normal">({count})</span>
            </p>
            <p className="text-xs text-muted-foreground">
              第 {count === 0 ? 0 : from + 1}–{Math.min(to + 1, count)} 条，共 {count} 条
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">姓名 / 邮箱</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">用户类型</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">注册时间</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      暂无数据。请更改筛选条件或创建新用户。
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      {/* 이름/이메일 */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {initials(u.name ?? u.email ?? "U")}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{u.name ?? "（未填写）"}</div>
                            <div className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* 역할 */}
                      <td className="px-5 py-4">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* 가입일 */}
                      <td className="px-5 py-4 text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>

                      {/* 액션 */}
                      <td className="px-5 py-4 text-right">
                        <Button asChild variant="outline" size="sm" className="h-8">
                          <Link href={`/admin/users/${u.id}`}>编辑</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">第 {page} / {totalPages} 页</p>
              <div className="flex items-center gap-2">
                <PagerButton href={buildHref({ q, role, page: page - 1, pageSize })} disabled={page <= 1}>
                  上一页
                </PagerButton>
                <PagerButton href={buildHref({ q, role, page: page + 1, pageSize })} disabled={page >= totalPages}>
                  下一页
                </PagerButton>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

function buildHref({ q, role, page, pageSize }: {
  q?: string; role?: string; page: number; pageSize: number
}) {
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
  try {
    return new Date(v ?? "").toLocaleDateString("zh-CN", {
      year: "numeric", month: "short", day: "numeric"
    })
  } catch { return "—" }
}

function PagerButton({ href, disabled, children }: {
  href: string; disabled?: boolean; children: React.ReactNode
}) {
  if (disabled) return <Button variant="outline" size="sm" disabled>{children}</Button>
  return <Button asChild variant="outline" size="sm"><Link href={href}>{children}</Link></Button>
}