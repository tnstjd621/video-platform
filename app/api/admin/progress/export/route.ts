export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  const category = searchParams.get("category") || ""
  const classroom = searchParams.get("classroom") || ""
  const completed = (searchParams.get("completed") as "all" | "yes" | "no") || "all"

  let query = adminSupabase.from("v_progress_admin").select("*")

  if (q) query = query.or(`student_name.ilike.%${q}%,student_email.ilike.%${q}%,video_title.ilike.%${q}%`)
  if (category) query = query.eq("category_id", category)
  if (completed === "yes") query = query.eq("completed", true)
  if (completed === "no") query = query.eq("completed", false)
  if (classroom) {
    // classrooms 문자열 검색
    const { data: c } = await adminSupabase.from("classrooms").select("id, name").eq("id", classroom).single()
    if (c?.name) query = query.ilike("classrooms", `%${c.name}%`)
  }

  const { data = [], error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const header = [
    "student_name","student_email","classrooms","video_title","category_name",
    "watched_duration","video_duration","percent_viewed","completed","last_watched_at"
  ]
  const lines = [header.join(",")]
  for (const r of data as any[]) {
    lines.push([
      csv(r.student_name),
      csv(r.student_email),
      csv(r.classrooms ?? ""),
      csv(r.video_title),
      csv(r.category_name ?? ""),
      r.watched_duration ?? 0,
      r.video_duration ?? 0,
      r.percent_viewed ?? 0,
      r.completed ? "true" : "false",
      r.last_watched_at ?? ""
    ].join(","))
  }
  const csvText = lines.join("\n")
  return new NextResponse(csvText, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="progress_export.csv"`
    }
  })
}

function csv(v: string) {
  const needsQuote = /[",\n]/.test(v)
  if (!needsQuote) return v
  return `"${v.replace(/"/g, '""')}"`
}
