// app/announcements/page.tsx
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin" // ✅ service role for author name map
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AnnouncementList } from "@/components/admin/announcement-list" // 재사용: 촘촘 리스트 + 모달
import MarkReadClient from "@/components/announcement-mark-read"

type Raw = Record<string, any>
type Norm = {
  id: string
  title: string | null
  content: string | null
  audience: string | null
  author_id: string | null
  author: string | null
  created_at: string | null
  classroom_id?: string | null
}

const isUUID = (v: unknown) => typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v)

function normalize(a: Raw): Norm {
  const authorId =
    (isUUID(a.author_id) && a.author_id) ||
    (isUUID(a.author) && a.author) ||
    (isUUID(a.created_by) && a.created_by) ||
    (isUUID(a.sender) && a.sender) ||
    null

  const authorName =
    (typeof a.author === "string" && !isUUID(a.author) && a.author) ||
    (typeof a.created_by === "string" && !isUUID(a.created_by) && a.created_by) ||
    (typeof a.sender === "string" && !isUUID(a.sender) && a.sender) ||
    null

  return {
    id: a.id,
    title: a.title ?? null,
    content: a.body ?? a.content ?? a.message ?? a.text ?? null,
    audience: a.audience ?? a.target ?? a.scope ?? null,
    author_id: authorId,
    author: authorName,
    created_at: a.created_at ?? a.inserted_at ?? a.createdAt ?? null,
    classroom_id: Object.prototype.hasOwnProperty.call(a, "classroom_id") ? a.classroom_id : null,
  }
}

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: me } = await supabase.from("profiles").select("id,role,name").eq("id", user.id).single()
  if (!me) redirect("/auth/login")

  // 공지 로딩 유틸: 결과 정규화 + author name 매핑
  const mapAuthors = async (list: Norm[]) => {
    const admin = createAdminClient()
    const ids = Array.from(new Set(list.map((x) => x.author_id).filter((v): v is string => !!v)))
    if (ids.length === 0) return list

    const { data: profs, error } = await admin
      .from("profiles")
      .select("id,name,email")
      .in("id", ids)

    if (!error && profs) {
      const idToName = new Map<string, string>(
        profs.map((p) => [p.id as string, (p.name as string) || (p.email as string) || "用户"])
      )
      return list.map((x) => ({
        ...x,
        author: x.author ?? (x.author_id ? idToName.get(x.author_id) ?? x.author_id : "系统管理员"),
      }))
    }
    return list
  }

  // 학생
  if (me.role === "student") {
    // 내가 속한 반들
    const { data: myClasses } = await supabase
      .from("classroom_students")
      .select("classroom_id")
      .eq("student_id", me.id)

    const myClassIds = (myClasses ?? []).map((r) => r.classroom_id)

    // 내 반 공지의 announcement id
    let classAnnIds: string[] = []
    if (myClassIds.length > 0) {
      const { data: links } = await supabase
        .from("announcement_classrooms")
        .select("ann_id")
        .in("classroom_id", myClassIds)
      classAnnIds = (links ?? []).map((r) => r.ann_id)
    }

    // 全体公告(学生/both)
    const { data: globalRaw = [] } = await supabase
      .from("announcements")
      .select("*")
      .in("audience", ["students", "both"])
      .order("created_at", { ascending: false })

    // 班级公告(classrooms & 내가 속한 반 매핑)
    let classRaw: Raw[] = []
    if (classAnnIds.length > 0) {
      const { data = [] } = await supabase
        .from("announcements")
        .select("*")
        .eq("audience", "classrooms")
        .in("id", classAnnIds)
        .order("created_at", { ascending: false })
      classRaw = data
    }

    // 정규화 + 저자 이름 매핑
    const globalList = await mapAuthors(globalRaw.map(normalize))
    const classList = await mapAuthors(classRaw.map(normalize))

    // 읽음표시용 ID
    const markIds = [...new Set([...globalList, ...classList].map((a) => a.id))]

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">公告</h1>
          <p className="text-sm text-muted-foreground">查看系统公告与班级公告</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 全体公告 */}
          <Card>
            <CardHeader>
              <CardTitle>全体公告</CardTitle>
              <CardDescription>面向学生或全部用户</CardDescription>
            </CardHeader>
            <CardContent>
              <AnnouncementList items={globalList as any} />
              {globalList.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">暂无公告</div>
              )}
            </CardContent>
          </Card>

          {/* 班级公告 */}
          <Card>
            <CardHeader>
              <CardTitle>班级公告</CardTitle>
              <CardDescription>仅显示你所在班级的公告</CardDescription>
            </CardHeader>
            <CardContent>
              <AnnouncementList items={classList as any} />
              {classList.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">暂无公告</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 읽음표시 업서트 */}
        <MarkReadClient ids={markIds} />
      </div>
    )
  }

  // 감독자/관리자/오너: 역할별 대상 공지 전체 표시 (촘촘 리스트 + 팝업)
  const audiences =
    me.role === "supervisor" ? ["supervisors", "both"] : ["supervisors", "students", "both", "classrooms"]

  const { data: raw = [] } = await supabase
    .from("announcements")
    .select("*")
    .in("audience", audiences)
    .order("created_at", { ascending: false })

  const list = await mapAuthors(raw.map(normalize))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">公告</h1>
        <p className="text-sm text-muted-foreground">查看与你角色相关的公告</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>全部</CardTitle>
          <CardDescription>共 {list.length} 条</CardDescription>
        </CardHeader>
        <CardContent>
          <AnnouncementList items={list as any} />
          {list.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">暂无公告</div>
          )}
        </CardContent>
      </Card>

      <MarkReadClient ids={list.map((a) => a.id)} />
    </div>
  )
}
