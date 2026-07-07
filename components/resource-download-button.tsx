"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Download } from "lucide-react"

export default function ResourceDownloadButton({
  fileUrl,
  fileName,
}: {
  fileUrl: string
  fileName: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [supabase] = useState(() => createClient())

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      // fileUrl에서 storage 경로 추출
      const url = new URL(fileUrl)
      const pathParts = url.pathname.split("/resources/")
      const filePath = pathParts[1]

      const { data, error } = await supabase.storage
        .from("resources")
        .createSignedUrl(filePath, 60) // 60초 유효

      if (error) throw error

      // 임시 URL로 다운로드
      const a = document.createElement("a")
      a.href = data.signedUrl
      a.download = fileName
      a.click()
    } catch (err) {
      console.error("下载失败:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline px-3 py-1.5 border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
    >
      <Download className="w-3.5 h-3.5" />
      {isLoading ? "下载中…" : "下载"}
    </button>
  )
}