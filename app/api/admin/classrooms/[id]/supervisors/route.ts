import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface Params {
  params: Promise<{ id: string }>
}

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, error: "需要登录" }

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || !["owner", "administrator"].includes(me.role)) {
    return { ok: false as const, status: 403, error: "没有权限" }
  }
  return { ok: true as const }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: classroomId } = await params
  const supabase = await createClient()

  const check = await checkAdmin(supabase)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { supervisor_id } = await req.json()
  if (!supervisor_id) return NextResponse.json({ error: "缺少 supervisor_id" }, { status: 400 })

  const { error } = await supabase
    .from("classroom_supervisors")
    .insert({ classroom_id: classroomId, supervisor_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: classroomId } = await params
  const supabase = await createClient()

  const check = await checkAdmin(supabase)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const supervisorId = req.nextUrl.searchParams.get("supervisor_id")
  if (!supervisorId) return NextResponse.json({ error: "缺少 supervisor_id" }, { status: 400 })

  const { error } = await supabase
    .from("classroom_supervisors")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("supervisor_id", supervisorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}