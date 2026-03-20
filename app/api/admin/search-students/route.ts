export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()

    let query = adminSupabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("role", "student")
      .order("name", { ascending: true })
      .limit(200)

    if (q) {
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}