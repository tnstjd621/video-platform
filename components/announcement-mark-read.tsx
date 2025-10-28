"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function MarkReadClient({ ids }: { ids: string[] }) {
  useEffect(() => {
    const run = async () => {
      if (!ids || ids.length === 0) return
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 아직 읽음 표시가 없는 것들만 upsert 하고 싶으면, 서버에서 읽음 목록을 내려받아 비교 후 보내면 좋지만
      // 여기서는 간단하게 한번씩 upsert (중복 PK 무시) 처리
      const rows = ids.map((id) => ({ ann_id: id, user_id: user.id }))
      // 대량 upsert
      await supabase.from("announcement_reads").upsert(rows, { onConflict: "ann_id,user_id" })
    }
    run()
  }, [ids])

  return null
}
