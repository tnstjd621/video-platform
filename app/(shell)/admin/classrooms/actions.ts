"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { adminSupabase } from "@/lib/supabase/admin"

export async function deleteClassroomAction(classroomId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("需要登录")

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || (me.role !== "administrator" && me.role !== "owner")) {
    throw new Error("没有权限")
  }

  // 배정된 학생 연결 먼저 해제
  const { error: unassignError } = await adminSupabase
    .from("classroom_students")
    .delete()
    .eq("classroom_id", classroomId)

  if (unassignError) throw new Error("解除学生分配失败：" + unassignError.message)

  const { error: deleteError } = await adminSupabase
    .from("classrooms")
    .delete()
    .eq("id", classroomId)

  if (deleteError) throw new Error("删除班级失败：" + deleteError.message)

  revalidatePath("/admin/classrooms")
}