import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { NAV_BY_ROLE, type Role } from "@/lib/nav"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,name,email")
    .eq("id", user!.id)
    .single()

  const role = (profile?.role ?? "student") as Role

  // 사이드바 항목들에서 대시보드 자체(/dashboard)는 제외하고 카드로 표시
  const items = NAV_BY_ROLE[role]
    .flatMap(s => s.children)
    .filter(i => i.href !== "/dashboard")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">欢迎回来，{profile?.name ?? profile?.email}</h1>
        <p className="text-sm text-muted-foreground">用户类型：{roleName(role)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((it, idx) => (
    <Link key={it.href} href={it.href} className="group block">
      <Card
  className="overflow-hidden transition
             hover:shadow-lg hover:ring-1 hover:ring-[var(--brand)]
             focus-within:ring-2 focus-within:ring-[var(--brand)]"
>
        {/* 상단 컬러 스트립: 브랜드 컬러로 통일 */}
        <div className="h-20 bg-[var(--brand)]" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {it.Icon ? <it.Icon className="h-5 w-5 text-muted-foreground" /> : null}
            <CardTitle className="line-clamp-1">{it.label}</CardTitle>
          </div>
          {it.desc ? <CardDescription className="line-clamp-1">{it.desc}</CardDescription> : null}
        </CardHeader>
        
      </Card>
    </Link>
  ))}
</div>
    </div>
  )
}

function roleName(role: string) {
  switch (role) {
    case "owner": return "系统所有者"
    case "administrator": return "管理员"
    case "supervisor": return "班主任"
    case "student": return "学生"
    default: return "未知"
  }
}
