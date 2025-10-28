import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "이메일이 필요합니다" }, { status: 400 })
    }

    // Service Role Key로 Admin 클라이언트 생성
    const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 사용자 찾기
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()

    if (getUserError) {
      throw new Error(`사용자 조회 실패: ${getUserError.message}`)
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ error: "해당 이메일의 사용자를 찾을 수 없습니다" }, { status: 404 })
    }

    // 이메일 확인 처리
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true })

    if (confirmError) {
      throw new Error(`이메일 확인 실패: ${confirmError.message}`)
    }

    return NextResponse.json({
      message: "이메일이 성공적으로 확인되었습니다",
      user_id: user.id,
    })
  } catch (error: unknown) {
    console.error("이메일 확인 오류:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이메일 확인에 실패했습니다" },
      { status: 500 },
    )
  }
}
