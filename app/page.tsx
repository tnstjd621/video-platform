import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">E-Campus 在线教育平台</h1>
          <p className="text-xl text-muted-foreground mb-8">专业的视频教学管理系统</p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link href="/auth/login">登录</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">需要账户？请联系系统管理员</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">学生学习</CardTitle>
              <CardDescription>观看视频课程，跟踪学习进度</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">学生可以浏览课程分类，观看视频教程，并自动记录学习进度。</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">管理员管理</CardTitle>
              <CardDescription>管理用户和视频内容</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">管理员可以上传视频，管理课程分类，查看学生学习情况。</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">系统所有者</CardTitle>
              <CardDescription>完整的系统控制权限</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">系统所有者拥有最高权限，可以管理所有用户和系统设置。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
