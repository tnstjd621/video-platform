// app/classrooms/page.tsx (서버 컴포넌트 예시)
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ClassroomsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // RLS에 맡겨서 허용된 반만 내려오게
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
        <Card><CardContent className="py-8 text-center text-muted-foreground">暂无班级</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((c) => (
            <Card key={c.id} className="hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>{c.name}</CardTitle></CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link href={`/classroom/${c.id}`}>进入班级</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
