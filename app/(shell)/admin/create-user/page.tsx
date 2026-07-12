"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  UserPlus, ArrowLeft, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, Mail, Lock, User, ShieldCheck, Copy, Check
} from "lucide-react"
import Link from "next/link"

const ALL_ROLE_OPTIONS = [
  { value: "student", label: "学生", description: "可访问已授权课程内容" },
  { value: "supervisor", label: "班主任", description: "可管理班级及查看学生进度" },
  { value: "administrator", label: "管理员", description: "可管理用户、视频及分类" },
  { value: "owner", label: "所有者", description: "拥有系统最高权限" },
]

export default function CreateUserPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("student")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUserRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      if (!profile || !["owner", "administrator"].includes(profile.role)) { router.push("/dashboard"); return }
      setUserRole(profile.role)
    }
    checkUserRole()
  }, [router])

  // administrator는 owner 옵션을 볼 수 없음
  const ROLE_OPTIONS = userRole === "owner"
    ? ALL_ROLE_OPTIONS
    : ALL_ROLE_OPTIONS.filter(r => r.value !== "owner")

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let pw = ""
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length))
    setPassword(pw)
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "创建用户失败")

      setSuccess(`${email} / ${password}`)
      setEmail("")
      setPassword("")
      setName("")
      setRole("student")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "创建用户失败")
    } finally {
      setIsLoading(false)
    }
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const selectedRole = ROLE_OPTIONS.find(r => r.value === role)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-primary" />
              创建新用户
            </h1>
            <p className="text-sm text-muted-foreground mt-1">为系统创建新的用户账户</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回列表
            </Link>
          </Button>
        </div>

        {/* 폼 카드 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">用户信息</CardTitle>
            <CardDescription>填写新用户的基本信息</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-5">

              {/* 이름 */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  姓名 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="请输入姓名"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* 이메일 */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  邮箱地址 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* 역할 */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  用户类型 <span className="text-destructive">*</span>
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择用户类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRole && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    {selectedRole.description}
                  </p>
                )}
              </div>

              {/* 비밀번호 */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  密码 <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="pl-9"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomPassword}
                    className="gap-1.5 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    生成
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">建议使用随机生成的强密码</p>
              </div>

              {/* 에러 */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* 성공 - 로그인 정보 표시 */}
              {success && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    用户创建成功！
                  </div>
                  <div className="rounded-md bg-white border px-3 py-2.5 space-y-1">
                    <p className="text-xs text-muted-foreground">登录信息</p>
                    <p className="text-sm font-mono">{success}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => copyToClipboard(success)}
                  >
                    {copied
                      ? <><Check className="w-3.5 h-3.5 text-green-600" /> 已复制</>
                      : <><Copy className="w-3.5 h-3.5" /> 复制登录信息</>
                    }
                  </Button>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      创建中...
                    </span>
                  ) : "创建用户"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/users")}
                  disabled={isLoading}
                >
                  取消
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}