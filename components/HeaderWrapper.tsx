// components/HeaderWrapper.tsx (클라이언트 전용)
"use client"

import { usePathname } from "next/navigation"
import Header from "@/components/Header"

export default function HeaderWrapper() {
  const pathname = usePathname()
  const hideHeader = pathname.startsWith("/auth") // 로그인 관련 경로는 헤더 숨김

  if (hideHeader) return null
  return <Header />
}
