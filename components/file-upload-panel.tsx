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
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_MB = 10;

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
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "不支持的文件格式。支持：图片、PDF、Word文档";
    }
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

    const filePath = `${classroomId}/${currentUserId}/${Date.now()}_${file.name}`;

    // 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file, { upsert: false });

    setUploadProgress(70);

    if (uploadError || !uploadData) {
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

    // messages 테이블에 파일 메시지 저장
    const { error: msgError } = await supabase.from("messages").insert({
      classroom_id: classroomId,
      sender_id: currentUserId,
      receiver_id: receiverId,
      content: null,
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type,
      message_type: "file",
    });

    if (msgError) {
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
      },
      ...prev,
    ]);

    setSuccessMsg(`"${file.name}" 已发送！`);
    setTimeout(() => setSuccessMsg(null), 3000);

    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // input 초기화 (같은 파일 재업로드 허용)
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
      {/* 헤더 */}
      <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2">
        <Upload className="w-4 h-4" />
        <span>文件上传</span>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4 overflow-auto">
        {/* 드래그앤드롭 영역 */}
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
            支持图片、PDF、Word · 最大 {MAX_SIZE_MB}MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileChange}
          />
        </div>

        {/* 업로드 진행률 */}
        {isUploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>上传中...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5" />
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="flex items-center justify-between text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 성공 메시지 */}
        {successMsg && (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 이번 세션 업로드 기록 */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">本次上传记录</p>
            <div className="space-y-1.5">
              {uploadedFiles.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSize(file.size)} · {file.uploadedAt}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
