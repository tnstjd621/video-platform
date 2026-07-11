"use client"

import { useState } from "react"
import ChatBox from "@/components/chat-box"
import { cn } from "@/lib/utils"
import { Users } from "lucide-react"

type Supervisor = { id: string; name: string; email: string }

export default function ClassroomSupervisorChat({
  classroomId,
  currentUserId,
  supervisors,
}: {
  classroomId: string
  currentUserId: string
  supervisors: Supervisor[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    supervisors.length === 1 ? supervisors[0].id : null
  )

  if (supervisors.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border rounded-xl text-muted-foreground text-sm">
        该班级暂未分配班主任
      </div>
    )
  }

  // supervisor가 1명뿐이면 선택 UI 없이 바로 ChatBox만 표시 (ChatBox 자체 테두리 사용)
  if (supervisors.length === 1) {
    return (
      <ChatBox
        classroomId={classroomId}
        currentUserId={currentUserId}
        otherUserId={supervisors[0].id}
      />
    )
  }

  return (
    <div className="h-full flex gap-3">
      {/* 선택 목록 */}
      <div className="w-48 shrink-0 border rounded-xl flex flex-col bg-background shadow-sm">
        <div className="px-3 py-2.5 border-b text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          选择老师
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {supervisors.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={cn(
                "w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors",
                selectedId === s.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <p className="font-medium truncate">{s.name}</p>
              <p className={cn(
                "text-xs truncate",
                selectedId === s.id ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {s.email}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 min-w-0">
        {selectedId ? (
          <ChatBox
            key={selectedId}
            classroomId={classroomId}
            currentUserId={currentUserId}
            otherUserId={selectedId}
          />
        ) : (
          <div className="flex items-center justify-center h-full border rounded-xl text-muted-foreground text-sm">
            请从左侧选择一位老师开始聊天
          </div>
        )}
      </div>
    </div>
  )
}