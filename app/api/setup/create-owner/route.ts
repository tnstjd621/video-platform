import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: "Supabase 환경 변수가 설정되지 않았습니다",
        },
        { status: 500 },
      )
    }

    // Admin client 생성 (서비스 역할 키 사용)
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const ownerExists = existingUser.users.some((user) => user.email === "owner@ecampus.com")

    if (ownerExists) {
      return NextResponse.json({
        success: true,
        message: "Owner 계정이 이미 존재합니다!",
      })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: "owner@ecampus.com",
      password: "ChangeMe123!",
      email_confirm: true,
      user_metadata: {
        name: "System Owner",
        role: "owner",
      },
    })

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    if (userData.user) {
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: userData.user.id,
        email: "owner@ecampus.com",
        name: "System Owner",
        role: "owner",
      })

      if (profileError) {
        console.error("프로필 생성 오류:", profileError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Owner 계정이 성공적으로 생성되었습니다!",
    })
  } catch (error) {
    console.error("API 오류:", error)
    return NextResponse.json(
      {
        error: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}
