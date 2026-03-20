// middleware.ts
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr" // ✅ 이걸 사용

export async function middleware(req: NextRequest) {
  // 쿠키가 보존되는 NextResponse
  const res = NextResponse.next()

  // ✅ 미들웨어 전용 Supabase 클라이언트 (req/res 쿠키 바인딩)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    }
  )

  // Owner 전용 페이지 보호
  if (req.nextUrl.pathname.startsWith("/admin/videos/upload")) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const url = new URL("/auth/login", req.url)
      url.searchParams.set("redirect", req.nextUrl.pathname)
      return NextResponse.redirect(url) // ✅ NextResponse 사용
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "owner") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // ✅ 반드시 res 반환(쿠키 유지)
  return res
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/setup",
  ],
}
