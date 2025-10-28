// app/(shell)/profile/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import { ProfileEditForm } from "@/components/profile-edit-form"
import PasswordChangeForm from "@/components/password-change-form"

import { Mail, ShieldCheck, User as UserIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const supabase = await createClient()

  // 1) 인증 가드 (보통 (shell) 레이아웃에서 걸리지만 안전하게 한 번 더)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // 2) Supabase Auth 메타에서 역할 읽기 (app_metadata.role 권장)
  const appRole =
    ((user.app_metadata as any)?.role as string | undefined) ??
    ((user.user_metadata as any)?.role as string | undefined) ??
    null

  // 3) 프로필 보장 + 역할 동기화
  const profile = await ensureProfile(supabase, {
    id: user.id,
    email: user.email ?? null,
    name: (user.user_metadata as any)?.name ?? null,
    roleFromAuth: appRole,
  })

  const verified = !!user.email_confirmed_at
  const roleLabel = roleName(profile.role)

  return (
    <div className="space-y-6">
      {/* 타이틀/툴바 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">个人资料</h1>
          <p className="text-sm text-muted-foreground">管理您的个人信息与账号安全</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측 요약 카드 */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              账户概览
            </CardTitle>
            <CardDescription>基础信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full grid place-items-center text-white text-lg font-semibold bg-[var(--brand)]">
                {initials(profile.name ?? profile.email ?? "U")}
              </div>
              <div>
                <div className="text-base font-medium">{profile.name ?? profile.email}</div>
                <div className="text-xs text-muted-foreground">ID: {profile.id.slice(0, 8)}…</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{roleLabel}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  邮箱状态：{verified ? "已验证" : "未验证"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 우측 설정 탭 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle>设置</CardTitle>
            <CardDescription>更新账户信息与修改密码</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="mt-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="profile">基本资料</TabsTrigger>
                <TabsTrigger value="security">安全设置</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4">
                <div className="rounded-lg border p-4">
                  <ProfileEditForm profile={profile} />
                </div>
              </TabsContent>

              <TabsContent value="security" className="mt-4">
                <div className="rounded-lg border p-4">
                  <PasswordChangeForm />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

type Supa = Awaited<ReturnType<typeof createClient>>

async function ensureProfile(
  supabase: Supa,
  seed: { id: string; email: string | null; name: string | null; roleFromAuth: string | null }
) {
  // 1) 먼저 조회
  const { data: found } = await supabase
    .from("profiles")
    .select("id,name,email,role,updated_at")
    .eq("id", seed.id)
    .single()

  const roleSeed = seed.roleFromAuth?.trim() || null

  // 2) 이미 있으면 app_metadata.role과 불일치 시 동기화
  if (found) {
    if (roleSeed && found.role !== roleSeed) {
      await supabase.from("profiles").update({ role: roleSeed }).eq("id", seed.id)
      return { ...found, role: roleSeed }
    }
    return found
  }

  // 3) 없으면 삽입 (메타에 있으면 그 값, 없으면 student)
  const { data: inserted } = await supabase
    .from("profiles")
    .insert({
      id: seed.id,
      email: seed.email,
      name: seed.name,
      role: roleSeed ?? "student",
    })
    .select("id,name,email,role,updated_at")
    .single()

  if (inserted) return inserted

  // 4) 폴백 재조회
  const { data: retry } = await supabase
    .from("profiles")
    .select("id,name,email,role,updated_at")
    .eq("id", seed.id)
    .single()

  return (
    retry ?? { id: seed.id, name: seed.name, email: seed.email, role: roleSeed ?? "student", updated_at: null }
  )
}

function roleName(role: string) {
  switch (role) {
    case "owner":
      return "系统所有者"
    case "administrator":
      return "管理员"
    case "supervisor":
      return "班主任"
    case "student":
      return "学生"
    default:
      return "未知"
  }
}

function initials(name: string) {
  const s = name?.trim() ?? ""
  if (!s) return "U"
  const p = s.split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase()
}
