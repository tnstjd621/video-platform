import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { newPassword } = await req.json()
    const supabase = await createClient()

    // 현재 로그인한 사용자 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "未登录用户" }, { status: 401 })
    }

    // 비밀번호 업데이트
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: "密码修改成功" })
  } catch (err) {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
