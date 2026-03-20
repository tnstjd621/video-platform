// app/classrooms/[id]/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatBox from "@/components/chat-box";
import FileUploadPanel from "@/components/file-upload-panel";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ClassroomPageProps {
  params: { id: string };
}

export default async function ClassroomPage({ params }: ClassroomPageProps) {
  const supabase = await createClient();

  // 현재 로그인 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // 유저 프로필 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  // 반 정보 조회
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, supervisor_id")
    .eq("id", params.id)
    .single();

  if (!classroom) redirect("/classrooms");

  // 접근 권한 확인
  // - 해당 반 학생이거나
  // - 해당 반 supervisor이거나
  // - admin/owner 이어야 함
  const isStudent = await supabase
    .from("classroom_students")
    .select("id")
    .eq("classroom_id", params.id)
    .eq("student_id", user.id)
    .single();

  const isSupervisor = classroom.supervisor_id === user.id;
  const isAdmin = profile.role === "administrator" || profile.role === "owner";

  if (!isStudent.data && !isSupervisor && !isAdmin) {
    redirect("/classrooms");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* 반 이름 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">{classroom.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile.role === "supervisor" || isAdmin
              ? "管理员视图"
              : "学生视图"}
          </p>
        </div>

        {/* 채팅 + 파일 업로드 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          {/* 채팅창 - 2/3 비율 */}
          <div className="lg:col-span-2 h-full">
            <ChatBox
              classroomId={params.id}
              currentUserId={profile.id}
            />
          </div>

          {/* 파일 업로드 패널 - 1/3 비율 */}
          <div className="lg:col-span-1 h-full">
            <FileUploadPanel
              classroomId={params.id}
              currentUserId={profile.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}