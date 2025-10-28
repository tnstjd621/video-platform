// app/(shell)/admin/announcements/page.tsx
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin" // ✅ 서비스 롤
import { redirect } from "next/navigation"
import AnnouncementForm from "@/components/announcement-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnnouncementList } from "@/components/admin/announcement-list"

export const dynamic = "force-dynamic"

type RawAnn = Record<string, any>
type NormAnn = {
  id: string
  title: string | null
  content: string | null
  audience: string | null
  author_id: string | null  // 원시 UUID 저장
  author: string | null     // 표시용 이름
  created_at: string | null
  classroom_id: string | null
}

const isUUID = (v: unknown) =>
  typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v)

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()

  // 1) 인증
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // 2) 권한
  const { data: me } = await supabase
    .from("profiles")
    .select("role,name")
    .eq("id", user.id)
    .single()

  if (!me || !["owner", "administrator"].includes(me.role)) {
    redirect("/dashboard")
  }

  // 3) 공지 로드 (스키마 불일치 안전: *)
  const { data: raw, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[announcements] select error:", JSON.stringify(error, null, 2))
  }

  // 4) 1차 정규화 + author_id 추출 (author/author_id/created_by/sender 등 어디에 있든 처리)
  const normalized0: NormAnn[] = (raw ?? []).map((a: RawAnn) => {
    // 후보 필드에서 UUID를 author_id로, 문자열 이름은 author로
    const rawAuthorId =
      (isUUID(a.author_id) && a.author_id) ||
      (isUUID(a.author) && a.author) ||
      (isUUID(a.created_by) && a.created_by) ||
      (isUUID(a.sender) && a.sender) ||
      null

    const rawAuthorName =
      (typeof a.author === "string" && !isUUID(a.author) && a.author) ||
      (typeof a.created_by === "string" && !isUUID(a.created_by) && a.created_by) ||
      (typeof a.sender === "string" && !isUUID(a.sender) && a.sender) ||
      null

    return {
      id: a.id,
      title: a.title ?? null,
      content: a.content ?? a.body ?? a.message ?? a.text ?? null,
      audience: a.audience ?? a.target ?? a.scope ?? null,
      author_id: rawAuthorId,
      author: rawAuthorName, // 이미 이름 문자열이면 그대로 사용
      created_at: a.created_at ?? a.inserted_at ?? a.createdAt ?? null,
      classroom_id: Object.prototype.hasOwnProperty.call(a, "classroom_id") ? a.classroom_id : null,
    }
  })

  // 5) 서비스 롤로 author_id → 이름 매핑 (RLS 영향 X)
  const authorIds = Array.from(
    new Set(normalized0.map((a) => a.author_id).filter((v): v is string => Boolean(v)))
  )

  let idToName = new Map<string, string>()
  if (authorIds.length > 0) {
    const admin = createAdminClient() // ✅ 서비스 롤
    const { data: profs, error: pErr } = await admin
      .from("profiles")
      .select("id,name,email")
      .in("id", authorIds)

    if (pErr) {
      console.error("[announcements] profiles map error:", JSON.stringify(pErr, null, 2))
    } else {
      idToName = new Map(
        (profs ?? []).map((p) => [p.id as string, (p.name as string) || (p.email as string) || "用户"])
      )
    }
  }

  // 6) 2차 정규화: 표시용 author 채우기
  const normalized: NormAnn[] = normalized0.map((a) => ({
    ...a,
    author: a.author ?? (a.author_id ? idToName.get(a.author_id) ?? a.author_id : "系统管理员"),
  }))

  // 7) owner 는 반(클래스룸) 공지 제외
  const recent = normalized.filter((a) => (me.role === "owner" ? a.classroom_id == null : true))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">公告管理</h1>
        <p className="text-sm text-muted-foreground">
          创建系统公告并查看历史公告（所有者不包含班级公告）
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左：发布新公告 */}
        <Card>
          <CardHeader>
            <CardTitle>发布新公告</CardTitle>
            <CardDescription>选择受众并立即发送</CardDescription>
          </CardHeader>
          <CardContent>
            <AnnouncementForm />
          </CardContent>
        </Card>

        {/* 右：最近公告（紧凑列表 + 点击弹窗） */}
        <Card>
          <CardHeader>
            <CardTitle>最近公告</CardTitle>
            <CardDescription>共 {recent.length} 条</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                加载公告失败：{error.message || "Unknown error"}
              </div>
            ) : null}
            {/* 리스트/모달은 제목·作者·受众·日期 밀도로 표시 */}
            <AnnouncementList
              items={recent.map(({ author_id, ...rest }) => rest) as any}
              fallbackError={!!error}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
