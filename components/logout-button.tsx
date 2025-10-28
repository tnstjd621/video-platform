"use client"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()
  const onClick = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/auth/login")
  }
  return <Button variant="outline" onClick={onClick}>退出登录</Button>
}
