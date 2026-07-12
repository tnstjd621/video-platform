import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ImageIcon, Lock } from "lucide-react"
import ResourceUpload from "@/components/resource-upload"
import ResourceDeleteButton from "@/components/resource-delete-button"
import ResourceDownloadButton from "@/components/resource-download-button"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric", month: "short", day: "numeric",
  })
}

function FileIcon({ type }: { type: string | null }) {
  if (type?.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />
  return <FileText className="w-5 h-5 text-orange-500 shrink-0" />
}

export default async function RestrictedResourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/auth/login")

  if (!["owner", "administrator", "supervisor"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const canUpload = profile.role === "owner" || profile.role === "administrator" || profile.role === "supervisor"

  const { data: resources = [] } = await supabase
    .from("resources")
    .select("*")
    .eq("visibility", "restricted")
    .order("created_at", { ascending: false })

  const uploaderIds = [...new Set((resources ?? []).map(r => r.uploaded_by).filter(Boolean))]
  let idToName = new Map<string, string>()
  if (uploaderIds.length > 0) {
    const admin = createAdminClient()
    const { data: profs } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", uploaderIds)
    idToName = new Map((profs ?? []).map(p => [p.id, p.name || p.email || "用户"]))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Lock className="w-6 h-6" />
            s资料室
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {resources?.length ?? 0} 个文件 · 仅班主任及以上可见
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-3">
          {!resources || resources.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                暂无资料，等待上传
              </CardContent>
            </Card>
          ) : (
            resources.map((r) => (
              <Card key={r.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-3">
                    <FileIcon type={r.file_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {r.file_size && (
                          <Badge variant="secondary" className="text-xs">
                            {formatSize(r.file_size)}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {idToName.get(r.uploaded_by) ?? "系统"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(r.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ResourceDownloadButton
                        fileUrl={r.file_url}
                        fileName={r.file_name}
                      />
                      {canUpload && (
                        <ResourceDeleteButton
                          resourceId={r.id}
                          fileUrl={r.file_url}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          {canUpload ? (
            <ResourceUpload visibility="restricted" />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                仅管理员可上传文件
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}