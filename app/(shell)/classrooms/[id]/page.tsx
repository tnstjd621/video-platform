// app/classrooms/[id]/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatBox from "@/components/chat-box";
import FileUploadPanel from "@/components/file-upload-panel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ClassroomPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassroomPage({ params }: ClassroomPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, supervisor_id")
    .eq("id", id)
    .single();

  if (!classroom) redirect("/classrooms");

  const isSupervisor = classroom.supervisor_id === user.id;
  const isAdmin = profile.role === "administrator" || profile.role === "owner";

  const { data: studentRecord } = await supabase
    .from("classroom_students")
    .select("id")
    .eq("classroom_id", id)
    .eq("student_id", user.id)
    .single();

  if (!studentRecord && !isSupervisor && !isAdmin) {
    redirect("/classrooms");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{classroom.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSupervisor || isAdmin ? "管理员视图" : "学生视图"}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/classrooms">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回班级列表
            </Link>
          </Button>
        </div>

        {/* 채팅 + 파일 업로드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          <div className="lg:col-span-2 h-full">
            <ChatBox classroomId={id} currentUserId={profile.id} />
          </div>
          <div className="lg:col-span-1 h-full">
            <FileUploadPanel classroomId={id} currentUserId={profile.id} />
          </div>
        </div>

      </div>
    </div>
  );
}