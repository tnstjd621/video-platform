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

      const rows = ids.map((id) => ({ ann_id: id, user_id: user.id }))
      await supabase.from("announcement_reads").upsert(rows, { onConflict: "ann_id,user_id" })
    }
    run()
  }, [ids])

  return null
}
