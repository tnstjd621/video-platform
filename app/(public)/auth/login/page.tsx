// app/auth/login/page.tsx
"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Mail, User, Lock } from "lucide-react"

const BRAND_GREEN = "#1a3385ff" // i-Campus 톤에 가까운 녹색
const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN // 예: "example.com"

export default function LoginPage() {
  const router = useRouter()
  const [idOrEmail, setIdOrEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // ID만 입력해도 로그인 가능하게: ID -> email@DOMAIN 매핑
  const normalizeEmail = (raw: string) => {
    const v = raw.trim()
    if (v === "") return ""
    if (v.includes("@")) return v
    if (EMAIL_DOMAIN) return `${v}@${EMAIL_DOMAIN}`
    return v // 도메인 미설정 시 그대로 사용
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const supabase = createClient()

    try {
      const email = normalizeEmail(idOrEmail)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后再试。")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-xl">
        {/* 로고 */}
        <div className="flex flex-col items-center">
          {/* 로고 경로는 프로젝트에 맞게 교체: /logo.svg */}
          <Image src="/logo.svg" alt="i-Campus" width={220} height={54} priority />
          <div className="h-px w-full max-w-lg mt-6 bg-muted" />
        </div>

        {/* 폼 영역 (카드 느낌이지만 테두리 최소화) */}
        <Card className="mx-auto mt-8 w-full max-w-lg border-0 shadow-none">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* ID / Email */}
            <div className="space-y-2">
              <Label htmlFor="id" className="text-base">ID / 邮箱</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  {/* ID 아이콘: ID도, 이메일도 가능하다는 힌트 */}
                  <User className="h-5 w-5 text-muted-foreground" />
                </span>
                <Input
                  id="id"
                  type="text"
                  inputMode="email"
                  placeholder="请输入学号或邮箱"
                  autoComplete="username"
                  className="h-12 pl-10"
                  value={idOrEmail}
                  onChange={(e) => setIdOrEmail(e.target.value)}
                  required
                />
                {/* @ 도메인 힌트 */}
                {EMAIL_DOMAIN && !idOrEmail.includes("@") && idOrEmail.trim() !== "" && (
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    <Mail className="mr-1 inline-block h-3.5 w-3.5" />
                    @{EMAIL_DOMAIN}
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">密码</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </span>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="h-12 pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* LOGIN 버튼 (넓고, 진한 초록) */}
            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold"
              style={{ backgroundColor: BRAND_GREEN }}
              disabled={isLoading}
            >
              {isLoading ? "登录中…" : "LOGIN"}
            </Button>
          </form>

          {/* 도움 문구 (중국어, 작은 글씨) */}
          <ol className="mx-auto mt-8 w-full max-w-lg list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>本系统为校内<i>i-Campus</i>，仅限已注册用户使用。</li>
            <li>如需找回账号或重置密码，请联系管理员或在门户网站进行自助服务。</li>
            <li>首次登录成功后，部分功能需要完善个人资料后方可使用。</li>
            <li>若无法登录，请联系技术支持。</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
