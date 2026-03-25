// app/(shell)/layout.tsx
import "@/styles/globals.css"

import { Sidebar } from "@/components/sidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/logout-button"

export const dynamic = "force-dynamic"

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile?.role ?? "student") as "owner" | "administrator" | "supervisor" | "student"

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 좌측 고정 사이드바 */}
      <Sidebar role={role} />

      {/* 사이드바 폭과 동일한 좌측 패딩 확보 */}
      <div className="pl-[92px] md:pl-[150px]">
        {/* 상단 바: 우측에 로그아웃만 */}
        <header className="h-14 bg-white border-b flex items-center justify-end px-4">
          <LogoutButton />
        </header>

        {/* 본문 */}
        <main className="p-4 md:p-6">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
