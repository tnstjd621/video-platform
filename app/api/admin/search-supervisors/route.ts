import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "需要登录" }, { status: 401 })

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || !["owner", "administrator"].includes(me.role)) {
    return NextResponse.json({ error: "没有权限" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "supervisor")
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data })
}