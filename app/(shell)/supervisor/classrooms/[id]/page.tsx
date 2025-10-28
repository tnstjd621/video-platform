import { createClient } from "@/lib/supabase/server"
import { StudentProgressTable } from "@/components/student-progress-table"
import { AnnouncementForm } from "@/components/announcement-form"

export default async function ClassroomDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p>未登录</p>

  const { data: classroom } = await supabase.from("classrooms").select("*").eq("id", params.id).single()
  if (!classroom) return <p>班级不存在</p>

  // 학생 목록 + 진도율
  const { data: students } = await supabase
    .from("classroom_students")
    .select("student_id, profiles(name, email)")

  // 공지 목록
  const { data: announcements } = await supabase
    .from("classroom_announcements")
    .select("*")
    .eq("classroom_id", params.id)
    .order("created_at", { ascending: false })

  return (
    <div className="container p-6 space-y-6">
      <h1 className="text-2xl font-bold">{classroom.name}</h1>

      <StudentProgressTable students={students || []} classroomId={params.id} />

      <h2 className="text-xl font-semibold mt-6">公告管理</h2>
      <AnnouncementForm classroomId={params.id} />
      <ul className="space-y-2">
        {announcements?.map(a => (
          <li key={a.id} className="border p-2 rounded">
            <strong>{a.title}</strong> - {a.content}
          </li>
        ))}
      </ul>
    </div>
  )
}
