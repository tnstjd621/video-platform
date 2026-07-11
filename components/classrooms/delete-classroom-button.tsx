"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteClassroomAction } from "@/app/(shell)/admin/classrooms/actions"

export function DeleteClassroomButton({
  classroomId,
  classroomName,
  studentCount,
}: {
  classroomId: string
  classroomName: string
  studentCount: number
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    const message =
      studentCount > 0
        ? `确定要删除 "${classroomName}" 吗？\n该班级下的 ${studentCount} 名学生将被解除分配。\n此操作无法撤销。`
        : `确定要删除 "${classroomName}" 吗？\n此操作无法撤销。`

    const confirmed = window.confirm(message)
    if (!confirmed) return

    setError(null)
    startTransition(async () => {
      try {
        await deleteClassroomAction(classroomId)
      } catch (e) {
        setError(e instanceof Error ? e.message : "删除失败")
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {isPending ? "删除中..." : "删除"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}