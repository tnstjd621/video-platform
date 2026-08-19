import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import ChatBox from "@/components/chat-box"
import FileUploadPanel from "@/components/file-upload-panel"

export default async function StudentChatPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>
}) {
  const { id, studentId } = await params

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name")
    .eq("id", id)
    .single()

  if (!classroom) redirect("/supervisor/classrooms")

  // supervisor_id 대신 classroom_supervisors 조인 테이블로 권한 체크
  const { data: supervisorMembership } = await supabase
    .from("classroom_supervisors")
    .select("id")
    .eq("classroom_id", id)
    .eq("supervisor_id", user.id)
    .maybeSingle()

  if (!supervisorMembership) {
    redirect("/supervisor/classrooms")
  }

  const { data: student } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("id", studentId)
    .single()

  if (!student) redirect(`/supervisor/classrooms/${id}`)

  const { data: membership } = await supabase
    .from("classroom_students")
    .select("id")
    .eq("classroom_id", id)
    .eq("student_id", studentId)
    .single()

  if (!membership) redirect(`/supervisor/classrooms/${id}`)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {classroom.name} · {student.email}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/supervisor/classrooms/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回学生列表
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          <div className="lg:col-span-2 h-full">
            <ChatBox
              classroomId={id}
              currentUserId={user.id}
              otherUserId={studentId}
            />
          </div>

          <div className="lg:col-span-1 h-full min-h-0">
            <FileUploadPanel
              classroomId={id}
              currentUserId={user.id}
              receiverId={studentId}
            />
          </div>
        </div>

      </div>
    </div>
  )
}