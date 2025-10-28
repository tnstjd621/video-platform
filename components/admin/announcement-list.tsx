"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Item = {
  id: string
  title: string | null
  content: string | null
  audience: string | null
  author: string | null
  created_at: string | null
  classroom_id?: string | null
}

function AnnouncementListImpl({
  items,
  fallbackError,
}: {
  items: Item[]
  fallbackError?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<Item | null>(null)

  const rows = useMemo(
    () =>
      (items ?? []).map((a) => ({
        ...a,
        _dateText: a.created_at
          ? new Date(a.created_at).toLocaleString("zh-CN", { hour12: false })
          : "—",
      })),
    [items]
  )

  if (fallbackError) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        加载公告失败，请稍后重试。
      </div>
    )
  }

  if (!rows.length) {
    return <div className="text-muted-foreground text-sm py-8 text-center">暂无公告</div>
  }

  return (
    <>
      <div className="divide-y rounded-md border">
        {rows.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setCurrent(a)
              setOpen(true)
            }}
            className="w-full text-left p-2.5 hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 truncate font-medium">{a.title ?? "（无标题）"}</div>
              <div className="text-xs text-muted-foreground truncate">{a.author ?? "系统管理员"}</div>
              <div className="text-xs text-muted-foreground truncate">{a.audience ?? "全部用户"}</div>
              <div className="text-xs text-muted-foreground shrink-0">{a._dateText}</div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {current?.title ?? "（无标题）"}
            </DialogTitle>

            {/* DialogDescription 대신 div 사용 (p 안에 div 중첩 방지) */}
            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
              <div>
                <span className="text-muted-foreground">作者：</span>
                <span>{current?.author ?? "系统管理员"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">受众：</span>
                <span>{current?.audience ?? "全部用户"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">发信日：</span>
                <span>
                  {current?.created_at
                    ? new Date(current.created_at).toLocaleString("zh-CN", { hour12: false })
                    : "—"}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-2 whitespace-pre-wrap leading-relaxed text-sm">
            {current?.content ?? "（无内容）"}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ✅ default + named 둘 다 export
export default function AnnouncementList(props: Parameters<typeof AnnouncementListImpl>[0]) {
  return <AnnouncementListImpl {...props} />
}
export { AnnouncementListImpl as AnnouncementList }
