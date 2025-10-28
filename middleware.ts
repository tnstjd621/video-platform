import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { createClient } from "@/lib/supabase/server"

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Owner 전용 페이지 보호
  if (request.nextUrl.pathname.startsWith("/admin/videos/upload")) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.redirect(new URL("/auth/login", request.url))
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "owner") {
      return Response.redirect(new URL("/dashboard", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/setup",
  ],
}
