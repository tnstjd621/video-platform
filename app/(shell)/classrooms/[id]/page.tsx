// app/classrooms/[id]/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ClassroomSupervisorChat from "@/components/classroom-supervisor-chat";
import FileUploadPanel from "@/components/file-upload-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, School } from "lucide-react";
import { AnnouncementList } from "@/components/admin/announcement-list";
import MarkReadClient from "@/components/announcement-mark-read";

interface ClassroomPageProps {
  params: Promise<{ id: string }>;
}

type Raw = Record<string, any>;
const isUUID = (v: unknown) =>
  typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);

function normalize(a: Raw) {
  const authorId =
    (isUUID(a.author_id) && a.author_id) ||
    (isUUID(a.created_by) && a.created_by) ||
    null;
  const authorName =
    (typeof a.author === "string" && !isUUID(a.author) && a.author) ||
    null;
  return {
    id: a.id,
    title: a.title ?? null,
    content: a.body ?? a.content ?? null,
    audience: a.audience ?? null,
    author_id: authorId,
    author: authorName,
    created_at: a.created_at ?? null,
    classroom_id: a.classroom_id ?? null,
  };
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
    .select("id, name")
    .eq("id", id)
    .single();
  if (!classroom) redirect("/classrooms");

  // classroom_supervisors 기준으로 이 반의 supervisor 전원 조회
  const { data: csRows } = await supabase
    .from("classroom_supervisors")
    .select("supervisor_id")
    .eq("classroom_id", id);

  const supervisorIds = (csRows ?? []).map((r) => r.supervisor_id);
  const isSupervisor = supervisorIds.includes(user.id);
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

  // 학생이 볼 supervisor 목록 (이름/이메일 포함)
  let supervisorList: { id: string; name: string; email: string }[] = []
  if (!isSupervisor && !isAdmin && supervisorIds.length > 0) {
    const admin = createAdminClient()
    const { data: profs } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", supervisorIds)
    supervisorList = (profs ?? []).map((p: any) => ({
      id: p.id,
      name: p.name ?? p.email ?? "老师",
      email: p.email ?? "",
    }))
  }

  // FileUploadPanel용 receiver (첫 번째 supervisor로 기본 설정)
  const fallbackReceiverId = supervisorIds[0] ?? ""

  // ── 반 공고 fetch ──
  const { data: annLinks } = await supabase
    .from("announcement_classrooms")
    .select("ann_id")
    .eq("classroom_id", id);

  const annIds = (annLinks ?? []).map((r) => r.ann_id);

  let classAnnouncements: ReturnType<typeof normalize>[] = [];
  if (annIds.length > 0) {
    const { data: annRaw = [] } = await supabase
      .from("announcements")
      .select("*")
      .eq("audience", "classrooms")
      .in("id", annIds)
      .order("created_at", { ascending: false });

    const admin = createAdminClient();
    const authorIds = Array.from(
      new Set(annRaw.map((a) => a.created_by).filter(Boolean))
    );
    const { data: profs } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", authorIds);
    const idToName = new Map(
      (profs ?? []).map((p) => [p.id, p.name || p.email || "用户"])
    );

    classAnnouncements = annRaw.map((a) => ({
      ...normalize(a),
      author: idToName.get(a.created_by) ?? "系统管理员",
    }));
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

        {/* 반 공고 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <School className="w-4 h-4 text-purple-500" />
              班级公告
              {classAnnouncements.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {classAnnouncements.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无班级公告
              </p>
            ) : (
              <AnnouncementList items={classAnnouncements as any} />
            )}
          </CardContent>
        </Card>

        {/* 채팅 + 파일 업로드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          <div className="lg:col-span-2 h-full min-h-0">
            {isSupervisor || isAdmin ? (
              <div className="flex items-center justify-center h-full border rounded-xl text-muted-foreground text-sm">
                请从学生列表进入个别聊天
              </div>
            ) : (
              <ClassroomSupervisorChat
                classroomId={id}
                currentUserId={profile.id}
                supervisors={supervisorList}
              />
            )}
          </div>
          <div className="lg:col-span-1 h-full min-h-0">
            <FileUploadPanel
              classroomId={id}
              currentUserId={profile.id}
              receiverId={fallbackReceiverId}
            />
          </div>
        </div>
        <MarkReadClient ids={classAnnouncements.map((a) => a.id)} />
      </div>
    </div>
  );
}