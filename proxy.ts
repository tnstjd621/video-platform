// proxy.ts
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// ✅ Next.js 16: 함수 이름을 "proxy"로 변경
export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const url = new URL("/auth/login", req.url)
      url.searchParams.set("redirect", req.nextUrl.pathname)
      return NextResponse.redirect(url)
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

  return res
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/setup",
  ],
}