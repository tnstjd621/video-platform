import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, ImageIcon, Download, ArrowLeft } from "lucide-react"
import ChatBox from "@/components/chat-box"

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

  const { data: files } = await supabase
    .from("messages")
    .select("id, file_url, file_name, file_type, created_at")
    .eq("classroom_id", id)
    .eq("sender_id", studentId)
    .eq("receiver_id", user.id) // 이 supervisor에게 보낸 파일만
    .eq("message_type", "file")
    .order("created_at", { ascending: false })

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  const getFileIcon = (type: string | null) => {
    if (type?.startsWith("image/"))
      return <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
    return <FileText className="w-4 h-4 text-orange-500 shrink-0" />
  }

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

          <div className="lg:col-span-1 h-full border rounded-xl bg-background shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>学生上传的文件</span>
              {files && files.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{files.length}</Badge>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4">
              {!files || files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">暂无上传文件</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      {getFileIcon(file.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name ?? "파일"}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(file.created_at)}</p>
                      </div>
                      <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}