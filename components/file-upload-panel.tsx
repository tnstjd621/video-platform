"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, ImageIcon, Upload, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadPanelProps {
  classroomId: string;
  currentUserId: string;
  receiverId: string;
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  filePath: string; // storage 삭제용
  messageId: string; // messages 테이블 삭제용
}

const MAX_SIZE_MB = 2000;

// Storage 키(경로)는 공백/한글/특수문자를 못 받으므로 안전한 문자열로 변환
// 화면에 보여줄 원본 파일명(file.name)은 따로 DB에 저장하니 그대로 유지됨
const sanitizeFileName = (name: string) => {
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot !== -1 ? name.slice(lastDot) : "";
  const base = lastDot !== -1 ? name.slice(0, lastDot) : name;

  const safeBase = base
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const safeExt = ext.replace(/[^\w.]/g, "");

  return `${safeBase || "file"}${safeExt}`;
};

export default function FileUploadPanel({
  classroomId,
  currentUserId,
  receiverId,
}: FileUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `文件大小不能超过 ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(10);

    const filePath = `${classroomId}/${currentUserId}/${Date.now()}_${sanitizeFileName(file.name)}`;

    // 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file, { upsert: false });

    setUploadProgress(70);

    if (uploadError || !uploadData) {
      console.error("STORAGE 단계에서 실패:", uploadError);
      setError("上传失败，请重试");
      setIsUploading(false);
      setUploadProgress(0);
      return;
    }

    // Signed URL 생성 (비공개 버킷이므로)
    const { data: urlData } = await supabase.storage
      .from("chat-files")
      .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7); // 7일 유효

    setUploadProgress(90);

    const fileUrl = urlData?.signedUrl ?? "";

    // messages 테이블에 파일 메시지 저장 (실제 storage 경로도 같이 저장 -> 나중에 삭제할 때 사용)
    const { data: msgData, error: msgError } = await supabase
      .from("messages")
      .insert({
        classroom_id: classroomId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: null,
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
        file_path: uploadData.path,
        message_type: "file",
      })
      .select("id")
      .single();

    if (msgError || !msgData) {
      console.error("DB INSERT 단계에서 실패:", msgError);
      setError("文件消息发送失败");
      setIsUploading(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(100);

    // 업로드 기록 추가
    setUploadedFiles((prev) => [
      {
        name: file.name,
        url: fileUrl,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        filePath: uploadData.path,
        messageId: msgData.id,
      },
      ...prev,
    ]);

    setSuccessMsg(`"${file.name}" 已发送！`);
    setTimeout(() => setSuccessMsg(null), 3000);

    setIsUploading(false);
    setUploadProgress(0);
  };

  // 업로드 기록 목록에서 X 클릭 시: storage 파일 + messages 레코드 완전 삭제
  const deleteUploadedFile = async (item: UploadedFile) => {
    const { error: storageError } = await supabase.storage
      .from("chat-files")
      .remove([item.filePath]);

    if (storageError) {
      console.error("파일 삭제 실패(storage):", storageError);
      setError("删除失败，请重试");
      return;
    }

    const { error: dbError } = await supabase
      .from("messages")
      .delete()
      .eq("id", item.messageId);

    if (dbError) {
      console.error("메시지 삭제 실패(db):", dbError);
      setError("删除失败，请重试");
      return;
    }

    setUploadedFiles((prev) => prev.filter((f) => f.messageId !== item.messageId));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-orange-500" />;
  };

  return (
    <div className="flex flex-col h-full border rounded-xl bg-background shadow-sm">
      <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2">
        <Upload className="w-4 h-4" />
        <span>文件上传</span>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4 overflow-auto">
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">点击或拖拽文件到此处</p>
          <p className="text-xs text-muted-foreground mt-1">
            支持所有文件格式 · 最大 {MAX_SIZE_MB}MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {isUploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>上传中...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">本次上传记录</p>
            <div className="space-y-1.5">
              {uploadedFiles.map((file) => (
                <div
                  key={file.messageId}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatSize(file.size)} · {file.uploadedAt}
                      </p>
                    </div>
                  </a>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteUploadedFile(file);
                    }}
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="删除文件"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}