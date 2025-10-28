import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, name, role } = body

  // Supabase Admin Client (Service Role Key 사용)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1) Auth.users에 계정 생성
  const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 2) profiles 테이블에 추가
  const { error: profErr } = await supabaseAdmin.from("profiles").insert({
    id: user.user?.id,
    email,
    name,
    role,
  })

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 400 })
  }

  return NextResponse.json({ message: "User created", id: user.user?.id })
}
