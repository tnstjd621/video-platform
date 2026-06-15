// app/classrooms/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ClassroomsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  const isAdmin = profile.role === "administrator" || profile.role === "owner";
  const isSupervisor = profile.role === "supervisor";

  // 학생이면 자기 반으로 자동 리다이렉트
  if (!isAdmin && !isSupervisor) {
    const { data: myClass } = await supabase
      .from("classroom_students")
      .select("classroom_id")
      .eq("student_id", user.id)
      .single();

    if (myClass?.classroom_id) {
      redirect(`/classrooms/${myClass.classroom_id}`);
    }
  }

  // supervisor / admin은 전체 반 목록 표시
  const { data: classrooms, error } = await supabase
    .from("classrooms")
    .select("id, name")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("classrooms load error:", error.message);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的班级</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">返回仪表板</Link>
        </Button>
      </div>

      {!classrooms || classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            暂无班级
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((c) => (
            <Card key={c.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link href={`/classrooms/${c.id}`}>进入班级</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}