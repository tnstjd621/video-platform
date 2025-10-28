"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ProfileEditFormProps {
  profile: {
    id: string
    name: string
    email: string
    role: string
    avatar_url?: string
  }
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [name, setName] = useState(profile.name)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
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
        <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">邮箱地址无法修改</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">用户类型</Label>
        <Input id="role" type="text" value={getRoleDisplayName(profile.role)} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">用户类型由管理员设置</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar">头像链接</Label>
        <Input
          id="avatar"
          type="url"
          placeholder="https://example.com/avatar.jpg"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

      {success && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">个人资料更新成功！</div>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "更新中..." : "更新资料"}
      </Button>
    </form>
  )
}

function getRoleDisplayName(role: string) {
  switch (role) {
    case "student":
      return "学生"
    case "administrator":
      return "管理员"
    case "owner":
      return "系统所有者"
    default:
      return "未知"
  }
}
