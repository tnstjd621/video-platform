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

const BRAND_GREEN = "#37499a"
const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN

export default function LoginPage() {
  const router = useRouter()
  const [idOrEmail, setIdOrEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const normalizeEmail = (raw: string) => {
    const v = raw.trim()
    if (v === "") return ""
    if (v.includes("@")) return v
    if (EMAIL_DOMAIN) return `${v}@${EMAIL_DOMAIN}`
    return v
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
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 overflow-hidden pt-50">
      {/* 배경 이미지 */}
      <Image
        src="/login-bg.png"
        alt=""
        fill
        priority
        className="object-cover"
      />

      {/* 반투명 오버레이 */}
      <div className="absolute inset-0 bg-white/55" />

      {/* 콘텐츠 영역 - 크기 축소 (max-w-xl -> max-w-sm) */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center">
          <h1
            className="text-5xl md:text-7xl font-bold tracking-wide drop-shadow-sm"
            style={{ color: "#635bcb" }}
          >
          </h1>
          <div className="h-px w-full mt-4 bg-muted" />
        </div>

        <Card className="mx-auto mt-6 w-full border-0= shadow-xl bg-white/85 backdrop-blur-sm">
          <div className="p-3">
            <form onSubmit={onSubmit} className="space-y-1.5">
              <div className="space-y-1.5">
                <Label htmlFor="id" className="text-sm">ID / 邮箱</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <Input
                    id="id"
                    type="text"
                    inputMode="email"
                    placeholder="请输入学号或邮箱"
                    autoComplete="username"
                    className="h-10 pl-9 text-sm"
                    value={idOrEmail}
                    onChange={(e) => setIdOrEmail(e.target.value)}
                    required
                  />
                  {EMAIL_DOMAIN && !idOrEmail.includes("@") && idOrEmail.trim() !== "" && (
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      <Mail className="mr-1 inline-block h-3 w-3" />
                      @{EMAIL_DOMAIN}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">密码</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    className="h-10 pl-9 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-10 w-full text-sm font-semibold"
                style={{ backgroundColor: BRAND_GREEN }}
                disabled={isLoading}
              >
                {isLoading ? "登录中…" : "LOGIN"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}