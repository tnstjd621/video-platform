export const runtime = "nodejs";            // ✅ Node 런타임 강제
export const dynamic = "force-dynamic";     // (선택)

import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/admin"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const classroomId = params.id
    const body = await req.json().catch(() => ({}))
    const student_id = body?.student_id as string | undefined
    if (!student_id) return NextResponse.json({ error: "student_id is required" }, { status: 400 })

    const { error } = await adminSupabase
      .from("classroom_students")
      .insert({ classroom_id: classroomId, student_id })
      .single()

    if (error) {
      if (error.code === "23505") return NextResponse.json({ ok: true }) // 중복은 통과
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const classroomId = params.id
    const { searchParams } = new URL(req.url)
    const student_id = searchParams.get("student_id")
    if (!student_id) return NextResponse.json({ error: "student_id is required" }, { status: 400 })

    const { error } = await adminSupabase
      .from("classroom_students")
      .delete()
      .match({ classroom_id: classroomId, student_id })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
