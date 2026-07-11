"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteUserAction } from "@/app/(shell)/admin/users/actions"

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    const confirmed = window.confirm(`确定要删除账户 "${userName}" 吗？\n此操作无法撤销。`)
    if (!confirmed) return

    setError(null)
    startTransition(async () => {
      try {
        await deleteUserAction(userId)
      } catch (e) {
        setError(e instanceof Error ? e.message : "删除失败")
      }
    })
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="w-3.5 h-3.5 mr-1" />
        {isPending ? "删除中..." : "删除"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}