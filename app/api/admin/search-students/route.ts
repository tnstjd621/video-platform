export const runtime = "nodejs";            // ✅ Node 런타임 강제
export const dynamic = "force-dynamic";     // (선택) 캐시 방지

import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()
    if (!q) return NextResponse.json({ data: [] })

    const { data, error } = await adminSupabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("role", "student")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
