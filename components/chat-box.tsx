"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, FileText, Download, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_path: string | null;
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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const oldestCreatedAtRef = useRef<string | null>(null);
  const [supabase] = useState(() => createClient());

  const SELECT_FIELDS = `
    id, content, file_url, file_name, file_type, file_path,
    message_type, created_at, sender_id, receiver_id,
    profiles (name, role)
  `;

  const baseFilter = () =>
    supabase
      .from("messages")
      .select(SELECT_FIELDS)
      .eq("classroom_id", classroomId)
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      );

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
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "messages",
            filter: `classroom_id=eq.${classroomId}`,
          },
          (payload) => {
            const deletedId = (payload.old as { id: string }).id;
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [classroomId, currentUserId, otherUserId]);

  const hasScrolledInitially = useRef(false);
  useEffect(() => {
    if (initialLoaded && !hasScrolledInitially.current) {
      hasScrolledInitially.current = true;
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [initialLoaded]);

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

  // 파일 메시지 삭제: Storage의 실제 파일 -> messages 레코드 순서로 삭제
  const deleteFileMessage = async (msg: Message) => {
    if (deletingIds.has(msg.id)) return;

    setDeletingIds((prev) => new Set(prev).add(msg.id));

    // 1. Storage에서 실제 파일 삭제 (file_path가 있을 때만)
    if (msg.file_path) {
      const { error: storageError } = await supabase.storage
        .from("chat-files")
        .remove([msg.file_path]);

      if (storageError) {
        console.error("파일 삭제 실패(storage):", storageError);
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(msg.id);
          return next;
        });
        return;
      }
    }

    // 2. messages 테이블에서 레코드 삭제
    const { error: dbError } = await supabase.from("messages").delete().eq("id", msg.id);

    if (dbError) {
      console.error("메시지 삭제 실패(db):", dbError);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
      return;
    }

    // 3. 화면에서 제거 (realtime DELETE 이벤트로도 제거되지만, 즉시 반영을 위해 직접 처리)
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(msg.id);
      return next;
    });
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
    <div className="flex flex-col h-full border rounded-xl bg-background shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2 shrink-0">
        💬 <span>班级聊天室</span>
      </div>

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
            const isDeleting = deletingIds.has(msg.id);

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
                    <div className="relative group">
                      <a
                        href={msg.file_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-2xl text-sm border",
                          isMe ? "bg-primary/10 text-primary rounded-br-sm" : "bg-muted rounded-bl-sm",
                          isDeleting && "opacity-40 pointer-events-none"
                        )}
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate max-w-[160px]">{msg.file_name}</span>
                        <Download className="w-3 h-3 shrink-0" />
                      </a>
                      {isMe && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteFileMessage(msg);
                          }}
                          disabled={isDeleting}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                          aria-label="删除文件"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <X className="w-2.5 h-2.5" />
                          )}
                        </button>
                      )}
                    </div>
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