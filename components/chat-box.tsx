"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, FileText, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  message_type: "text" | "file";
  created_at: string;
  sender_id: string;
  receiver_id: string;
  profiles: {
    name: string;
    role: string;
  };
}

interface ChatBoxProps {
  classroomId: string;
  currentUserId: string;
  otherUserId: string;
}

const PAGE_SIZE = 50;

export default function ChatBox({ classroomId, currentUserId, otherUserId }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const oldestCreatedAtRef = useRef<string | null>(null);
  const [supabase] = useState(() => createClient());

  const baseFilter = () =>
    supabase
      .from("messages")
      .select(
        `
        id, content, file_url, file_name, file_type,
        message_type, created_at, sender_id, receiver_id,
        profiles (name, role)
      `
      )
      .eq("classroom_id", classroomId)
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      );

  // 최초 로드: 최신 PAGE_SIZE개만 가져와서 오름차순으로 뒤집기
  const fetchInitialMessages = async () => {
    const { data, error } = await baseFilter()
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!error && data) {
      const ordered = [...data].reverse() as Message[];
      setMessages(ordered);
      oldestCreatedAtRef.current = ordered[0]?.created_at ?? null;
      setHasMore(data.length === PAGE_SIZE);
    }
    setInitialLoaded(true);
  };

  // 스크롤을 위로 올렸을 때 이전 메시지 로드
  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestCreatedAtRef.current) return;
    setLoadingMore(true);

    const container = scrollRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    const { data, error } = await baseFilter()
      .lt("created_at", oldestCreatedAtRef.current)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!error && data) {
      const ordered = [...data].reverse() as Message[];
      setMessages((prev) => [...ordered, ...prev]);
      if (ordered.length > 0) oldestCreatedAtRef.current = ordered[0].created_at;
      setHasMore(data.length === PAGE_SIZE);

      // 이전 메시지가 위에 붙으면서 스크롤 위치가 튀지 않도록 보정
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, classroomId, currentUserId, otherUserId]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    if (container.scrollTop < 60) {
      loadOlderMessages();
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      await fetchInitialMessages();

      channel = supabase
        .channel(`messages:${classroomId}:${currentUserId}:${otherUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `classroom_id=eq.${classroomId}`,
          },
          async (payload) => {
            const { sender_id, receiver_id } = payload.new;
            const isRelevant =
              (sender_id === currentUserId && receiver_id === otherUserId) ||
              (sender_id === otherUserId && receiver_id === currentUserId);
            if (!isRelevant) return;

            const { data: profile } = await supabase
              .from("profiles")
              .select("name, role")
              .eq("id", sender_id)
              .single();

            setMessages((prev) => [
              ...prev,
              {
                ...(payload.new as Message),
                profiles: profile || { name: "알수없음", role: "student" },
              },
            ]);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [classroomId, currentUserId, otherUserId]);

  // 최초 로딩 완료 시: 애니메이션 없이 즉시 맨 아래로
  const hasScrolledInitially = useRef(false);
  useEffect(() => {
    if (initialLoaded && !hasScrolledInitially.current) {
      hasScrolledInitially.current = true;
      // 레이아웃이 완전히 그려진 다음 프레임에 스크롤 (그래야 확실히 맨 아래로 감)
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [initialLoaded]);

// 이후 새 메시지가 왔을 때만 부드럽게 맨 아래로 (이전 메시지 로드 시에는 스크롤 유지)
const prevMessageCount = useRef(0);
useEffect(() => {
  if (!hasScrolledInitially.current) {
    prevMessageCount.current = messages.length;
    return;
  }
  const isNewMessageAppended = messages.length > prevMessageCount.current && !loadingMore;
  if (isNewMessageAppended) {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  prevMessageCount.current = messages.length;
}, [messages]);

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      classroom_id: classroomId,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content,
      message_type: "text",
    });

    if (error) {
      console.error("메시지 전송 실패:", error);
      setNewMessage(content);
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  const getRoleBadge = (role: string) => {
    if (role === "supervisor") return "管理员";
    if (role === "administrator" || role === "owner") return "超级管理员";
    return null;
  };

  return (
    // h-full + overflow-hidden으로 바깥 카드 높이를 부모(h-[600px])에 고정
    <div className="flex flex-col h-full border rounded-xl bg-background shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2 shrink-0">
        💬 <span>班级聊天室</span>
      </div>

      {/* 이 div가 실제 스크롤 컨테이너. flex-1 + min-h-0 필수 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
      >
        <div className="space-y-4">
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <p className="text-center text-[10px] text-muted-foreground py-2">
              — 没有更多消息了 —
            </p>
          )}

          {initialLoaded && messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">
              暂无消息，开始聊天吧！
            </p>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const badge = getRoleBadge(msg.profiles?.role);

            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {msg.profiles?.name?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>

                <div className={cn("flex flex-col max-w-[68%]", isMe ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {isMe ? "我" : (msg.profiles?.name ?? "알수없음")}
                    </span>
                    {badge && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </div>

                  {msg.message_type === "file" ? (
                    <a
                      href={msg.file_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-2xl text-sm border",
                        isMe ? "bg-primary/10 text-primary rounded-br-sm" : "bg-muted rounded-bl-sm"
                      )}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-[160px]">{msg.file_name}</span>
                      <Download className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <div className={cn(
                      "px-3 py-2 rounded-2xl text-sm break-words",
                      isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                    )}>
                      {msg.content}
                    </div>
                  )}

                  <span className="text-[10px] text-muted-foreground mt-1">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="px-4 py-3 border-t flex gap-2 shrink-0">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息… (Enter 发送)"
          disabled={isSending}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}