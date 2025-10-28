"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserEditFormProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  currentUserRole: string
}

export function UserEditForm({ user, currentUserRole }: UserEditFormProps) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState(user.role)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/admin/users")
      }, 1500)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "更新失败")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">姓名</Label>
        <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">邮箱地址</Label>
        <Input id="email" type="email" value={user.email} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">邮箱地址无法修改</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">用户类型</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">学生</SelectItem>
            <SelectItem value="administrator">管理员</SelectItem>
            {currentUserRole === "owner" && <SelectItem value="owner">系统所有者</SelectItem>}
          </SelectContent>
        </Select>
        {currentUserRole !== "owner" && (
          <p className="text-xs text-muted-foreground">只有系统所有者可以设置其他用户为所有者</p>
        )}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">用户信息更新成功！正在返回用户列表...</div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "更新中..." : "更新用户"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
