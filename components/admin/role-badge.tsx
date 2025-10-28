import { Badge } from "@/components/ui/badge"

export function RoleBadge({ role }: { role?: string | null }) {
  switch (role) {
    case "owner":
      return <Badge variant="destructive">系统所有者</Badge>
    case "administrator":
      return <Badge>管理员</Badge>
    case "supervisor":
      return <Badge variant="outline">班主任</Badge>
    case "student":
      return <Badge variant="secondary">学生</Badge>
    default:
      return <Badge variant="outline">未知</Badge>
  }
}
