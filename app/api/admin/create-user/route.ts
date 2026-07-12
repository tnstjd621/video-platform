// app/api/admin/create-user/route.ts
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs" // Supabase SDK: Node 런타임 고정

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    // 1) 현재 로그인 유저 확인용(anon key)
    const supabase = await createClient()
    // 2) 관리자 권한(Service Role Key)
    const admin = createAdminClient()

    // 로그인 체크
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser()
    if (getUserError) {
      return NextResponse.json({ error: getUserError.message }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // owner 또는 administrator 권한 허용
    const { data: profile, error: profileReadError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileReadError) {
      return NextResponse.json({ error: profileReadError.message }, { status: 403 })
    }
    if (!profile || !["owner", "administrator"].includes(profile.role)) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    // 역할 화이트리스트
    const allowedRoles = ["student", "administrator", "supervisor", "owner"] as const
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "无效的角色类型" }, { status: 400 })
    }

    // administrator는 owner 계정을 생성할 수 없음
    if (profile.role === "administrator" && role === "owner") {
      return NextResponse.json({ error: "管理员无法创建所有者账户" }, { status: 403 })
    }

    // Supabase Auth에 사용자 생성 (service role)
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const newUserId = newUser.user?.id
    if (!newUserId) {
      return NextResponse.json({ error: "未能获取新用户ID" }, { status: 500 })
    }

    // profiles 동기화 (service role로 RLS 우회)
    const { error: profileError } = await admin.from("profiles").insert([
      {
        id: newUserId, // auth.users UUID
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
        id: newUserId,
        email: newUser.user?.email,
        role,
      },
    })
  } catch (error: any) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}