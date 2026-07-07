"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ResourceDeleteButton({
  resourceId,
  fileUrl,
}: {
  resourceId: string
  fileUrl: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const handleDelete = async () => {
    if (!confirm("确定要删除这个文件吗？")) return
    setIsDeleting(true)

    try {
      // Storage에서 파일 경로 추출 후 삭제
      const url = new URL(fileUrl)
      const pathParts = url.pathname.split("/resources/")
      if (pathParts[1]) {
        await supabase.storage.from("resources").remove([pathParts[1]])
      }

      await supabase.from("resources").delete().eq("id", resourceId)
      router.refresh()
    } catch (err) {
      console.error("删除失败:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8 text-muted-foreground hover:text-red-500"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  )
}