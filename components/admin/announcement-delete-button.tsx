"use client"

import { useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AnnouncementDeleteButton({ announcementId }: { announcementId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    const confirmed = window.confirm("确定要删除这条公告吗？此操作无法撤销。")
    if (!confirmed) return

    setError(null)
    startTransition(async () => {
      const { error: acError } = await supabase
        .from("announcement_classrooms")
        .delete()
        .eq("ann_id", announcementId)

      if (acError) {
        setError(acError.message)
        return
      }

      const { error: annError } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId)

      if (annError) {
        setError(annError.message)
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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