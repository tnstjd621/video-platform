import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function SupervisorClassroomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p>未登录</p>

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "supervisor") return <p>无权限</p>

  const { data: classes } = await supabase
    .from("classrooms")
    .select("*")
    .eq("supervisor_id", user.id)

  return (
    <div className="container p-6 space-y-4">
      <h1 className="text-2xl font-bold">我的班级</h1>
      {classes?.map(cls => (
        <Card key={cls.id}>
          <CardHeader>
            <CardTitle>{cls.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/supervisor/classrooms/${cls.id}`}>进入班级</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

