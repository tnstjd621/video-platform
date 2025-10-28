import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"  // Service Role Key 기반 admin client

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    // 일반 client (현재 로그인 유저 확인용)
    const supabase = await createClient()
    // admin client (유저 생성용)
    const admin = createAdminClient()

    // 🔹 현재 로그인한 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 🔹 owner 권한만 허용
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    // 🔹 role 화이트리스트 검증
    const allowedRoles = ["student", "administrator", "supervisor"]
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "无效的角色类型" }, { status: 400 })
    }

    // 🔹 Supabase Auth에 새 유저 생성
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 건너뜀
      user_metadata: { name, role },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // 🔹 profiles 테이블에 동기화
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: newUser.user?.id,  // auth.users의 UUID
        email,
        name,
        role,
      },
    ])

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      message: "用户创建成功",
      user: {
        id: newUser.user?.id,
        email: newUser.user?.email,
        role,
      },
    })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
