import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { UserEditForm } from "@/components/user-edit-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserEditPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has admin privileges
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || (profile.role !== "administrator" && profile.role !== "owner")) {
    redirect("/dashboard")
  }

  // Get user to edit
  const { data: userToEdit } = await supabase.from("profiles").select("*").eq("id", id).single()

  if (!userToEdit) {
    redirect("/admin/users")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">编辑用户</h1>
            <p className="text-muted-foreground">修改用户信息和权限</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/users">返回用户列表</Link>
          </Button>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>用户信息</CardTitle>
          </CardHeader>
          <CardContent>
            <UserEditForm user={userToEdit} currentUserRole={profile.role} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
