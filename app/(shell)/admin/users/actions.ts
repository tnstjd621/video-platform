"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function deleteUserAction(targetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("需要登录")

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || (me.role !== "administrator" && me.role !== "owner")) {
    throw new Error("没有权限")
  }

  if (targetId === user.id) {
    throw new Error("不能删除自己的账户")
  }

  const admin = createAdminClient()

  // Auth 계정 삭제 (profiles 테이블에 ON DELETE CASCADE가 걸려있다면 profiles row도 같이 삭제됨)
  const { error } = await admin.auth.admin.deleteUser(targetId)
  if (error) throw new Error("删除失败：" + error.message)

  // 혹시 CASCADE가 안 걸려있는 경우를 대비한 안전장치
  await admin.from("profiles").delete().eq("id", targetId)

  revalidatePath("/admin/users")
}