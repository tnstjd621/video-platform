"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

type Props = {
  videoUrl: string
  videoId: string
  userId: string
  userRole: "owner" | "administrator" | "supervisor" | "student"
  initialProgress?: number
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "")
    if (u.pathname.startsWith("/watch")) return u.searchParams.get("v")
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2]
    return null
  } catch {
    return null
  }
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}

function fitPlayerToContainer(player: any, container: HTMLElement, hostDiv: HTMLElement) {
  const rect = container.getBoundingClientRect()
  const w = Math.max(1, Math.floor(rect.width))
  const h = Math.max(1, Math.floor(rect.height))
  try {
    player?.setSize?.(w, h)
  } catch {}
  const iframe = hostDiv.querySelector("iframe") as HTMLIFrameElement | null
  if (iframe) {
    iframe.style.width = "100%"
    iframe.style.height = "100%"
    iframe.style.position = "absolute"
    iframe.style.inset = "0"
    // YouTube 표시 최소화
    iframe.style.border = "0"
  }
}

export function VideoPlayer({
  videoUrl,
  videoId,
  userId,
  userRole,
  initialProgress = 0,
}: Props) {
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)

  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(initialProgress || 0)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)
  const [showUI, setShowUI] = useState(true)
  const [isFs, setIsFs] = useState(false)
  const [bufferFrac, setBufferFrac] = useState(1) // 버퍼된 비율(0~1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const playbackRates = [0.5, 1, 1.25, 1.5, 2]
  const [lockUI, setLockUI] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)


  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const bufferTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // 우클릭 차단 (컨테이너 자체) ★
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const block = (e: Event) => e.preventDefault()
    el.addEventListener("contextmenu", block)
    return () => el.removeEventListener("contextmenu", block)
  }, [])

  // 전체화면 중에도 우클릭 차단 (문서 전역 capture) ★
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      const root = containerRef.current
      if (!root) return
      const fsEl = document.fullscreenElement
      // 전체화면이 아니더라도, 플레이어 영역 내부에서의 우클릭은 모두 차단
      if (root.contains(e.target as Node)) {
        e.preventDefault()
      }
      // 전체화면 상태에서 발생한 우클릭도 안전하게 차단
      if (fsEl && (fsEl === root || fsEl.contains(root))) {
        e.preventDefault()
      }
    }
    document.addEventListener("contextmenu", onCtx, { capture: true })
    return () => document.removeEventListener("contextmenu", onCtx, { capture: true } as any)
  }, [])

  // 키보드 컨텍스트 메뉴(Shift+F10, ContextMenu 키) 차단 ★
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      // Space는 아래에서 처리하니 여기선 컨텍스트만
      if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    el.addEventListener("keydown", onKey, true)
    return () => el.removeEventListener("keydown", onKey, true)
  }, [])

  // Iframe API 로드
  useEffect(() => {
    if (window.YT?.Player) return
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.body.appendChild(tag)
    return () => {
      try { document.body.removeChild(tag) } catch {}
    }
  }, [])

  // 플레이어 생성
  useEffect(() => {
    const tryInit = () => {
      if (!window.YT?.Player || !frameRef.current) return false
      const ytId = extractYouTubeId(videoUrl)
      if (!ytId) return false

      const player = new window.YT.Player(frameRef.current, {
        videoId: ytId,
        playerVars: {
          autoplay: 0,
          controls: 0,       // 기본 컨트롤 숨김
          modestbranding: 1,
          rel: 0,
          fs: 0,             // 유튜브 FS 버튼 숨김(커스텀 사용)
          disablekb: 0,
        },
        events: {
          onReady: (e: any) => {
            setIsReady(true)
            try { 
              e.target.setVolume(volume)
              e.target.setPlaybackRate(playbackRate)
            } catch {}
            if (initialProgress > 0) {
              try { e.target.seekTo(initialProgress, true) } catch {}
            }
            const d = Math.floor(e?.target?.getDuration?.() || 0)
            setDuration(d)

            if (containerRef.current && frameRef.current) {
              fitPlayerToContainer(e.target, containerRef.current, frameRef.current)
            }

            // 2초마다 진행도 저장(학생)
            
              progressTimer.current = setInterval(async () => {
                try {
                  const cur = Math.floor(e?.target?.getCurrentTime?.() || 0)
                  const dur = Math.floor(e?.target?.getDuration?.() || 0)
                  setCurrent(cur)
                  const completed = dur > 0 && cur >= Math.max(10, Math.floor(dur * 0.9))
                  await supabase.from("student_progress").upsert(
                    { student_id: userId, video_id: videoId, watched_duration: cur, completed },
                    { onConflict: "student_id,video_id" }
                  )
                } catch {}
              }, 1000)


            // 버퍼 업데이트(부드러운 진행 바)
            bufferTimer.current = setInterval(() => {
              try {
                const f = e?.target?.getVideoLoadedFraction?.() || 0
                setBufferFrac(Math.max(0, Math.min(1, f)))
              } catch {}
            }, 500)
          },
          onStateChange: (e: any) => {
            const state = e?.data // 1=play,2=pause,0=end
            setIsPlaying(state === 1)
            if (state === 0 && userRole === "student") {
              const cur = Math.floor(e?.target?.getCurrentTime?.() || 0)
              const dur = Math.floor(e?.target?.getDuration?.() || 0)
              supabase.from("student_progress").upsert(
                {
                  student_id: userId,
                  video_id: videoId,
                  watched_duration: cur,
                  completed: dur > 0 ? cur >= Math.max(10, Math.floor(dur * 0.9)) : true,
                },
                { onConflict: "student_id,video_id" }
              )
            }
          },
        },
      })

      playerRef.current = player
      return true
    }

    const id = setInterval(() => { if (tryInit()) clearInterval(id) }, 120)
    return () => clearInterval(id)
  }, [videoUrl, userId, userRole, videoId, initialProgress, supabase])

  // 리사이즈/FS 대응
  useEffect(() => {
    if (!containerRef.current || !frameRef.current) return
    const el = containerRef.current
    const host = frameRef.current
    const ro = new ResizeObserver(() => {
      if (playerRef.current) fitPlayerToContainer(playerRef.current, el, host)
    })
    ro.observe(el)
    const onFs = () => {
      setIsFs(Boolean(document.fullscreenElement))
      if (playerRef.current) fitPlayerToContainer(playerRef.current, el, host)
    }
    document.addEventListener("fullscreenchange", onFs)
    if (playerRef.current) fitPlayerToContainer(playerRef.current, el, host)
    return () => {
      ro.disconnect()
      document.removeEventListener("fullscreenchange", onFs)
    }
  }, [])

  // 언마운트 정리
  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current)
      if (bufferTimer.current) clearInterval(bufferTimer.current)
      try { playerRef.current?.destroy?.() } catch {}
    }
  }, [])

  // 3초 무동작 시 컨트롤 숨김(일시정지 중에는 계속 표시)
  const pokeUI = useCallback(() => {
    if (lockUI) return

    setShowUI(true)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
       if(isPlaying) setShowUI(false)
    }, 3000)
  }, [isPlaying, lockUI])
  useEffect(() => { pokeUI() }, [isReady, pokeUI, isPlaying])

  // 스페이스: 재생/일시정지 + 컨텍스트 키 차단 로직 보완 ★
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        const s = playerRef.current?.getPlayerState?.()
        if (s === 1) playerRef.current?.pauseVideo?.()
        else playerRef.current?.playVideo?.()
      }
      // 여분의 안전장치 (탭 포커스 시)
      if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    el.addEventListener("keydown", onKey)
    return () => el.removeEventListener("keydown", onKey)
  }, [])

  // 핸들러들
  const onSeek = (val: number) => {
    setCurrent(val)
    try { playerRef.current?.seekTo(val, true) } catch {}
    pokeUI()
  }

  const onSeekByPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onSeek(Math.floor(duration * ratio))
  }

  const onVolume = (v: number) => {
    const vol = Math.max(0, Math.min(100, v))
    setVolume(vol)
    setMuted(vol === 0)
    try {
      playerRef.current?.setVolume(vol)
      if (vol > 0) playerRef.current?.unMute?.()
      else playerRef.current?.mute?.()
    } catch {}
    pokeUI()
  }

  const togglePlay = () => {
    const s = playerRef.current?.getPlayerState?.()
    if (s === 1) playerRef.current?.pauseVideo?.()
    else playerRef.current?.playVideo?.()
    pokeUI()
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    try {
      if (next) {
        playerRef.current?.mute?.()
        setVolume(0)
      } else {
        playerRef.current?.unMute?.()
        const v = Math.max(30, volume)
        setVolume(v)
        playerRef.current?.setVolume?.(v)
      }
    } catch {}
    pokeUI()
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) await containerRef.current.requestFullscreen()
      else await document.exitFullscreen()
    } catch {}
    pokeUI()
  }

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    try { playerRef.current?.setPlaybackRate(rate) } catch {}
    pokeUI()
  }
  const percent = duration > 0 ? Math.round((current / duration) * 100) : 0

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-black/10 outline-none select-none" // select-none 추가 (사소한 복사 방지) ★
      tabIndex={0}
      onMouseMove={pokeUI}
      onClick={pokeUI}
    >
      {/* YouTube 프레임 */}
      <div ref={frameRef} className="absolute inset-0" />

      {/* 투명 오버레이: iframe 위의 모든 우클릭/마우스 인터랙션을 가로채기 ★
          - 좌클릭은 컨테이너 onClick으로 버블링되어 기존 동작 유지
          - 컨트롤/버튼은 오버레이보다 높은 z-index로 위치 */}
      <div
        className="absolute inset-0 z-10"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* 우상단 공유 아이콘 차단 (투명 오버레이) */}
      <div className="pointer-events-auto absolute right-0 top-0 h-16 w-16 z-20" onClick={(e) => e.stopPropagation()} />

      {/* 진행 퍼센트 배지 */}
      <div
        className={cn(
          "absolute right-3 top-3 select-none rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-md z-20", // z-20 ★
          showUI ? "opacity-100" : "opacity-0",
          "transition-opacity"
        )}
      >
        {percent}%
      </div>

      {/* 가운데 재생 버튼(일시정지 시) */}
      {!isPlaying && (
        <button
          onClick={(e) => { e.stopPropagation(); togglePlay() }}
          className="group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 p-6 backdrop-blur-md ring-1 ring-white/20 hover:bg-white/20 z-20" // z-20 ★
          aria-label="播放/暂停"
        >
          <svg viewBox="0 0 24 24" className="h-10 w-10 fill-white drop-shadow">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* 하단 그라디언트 + 컨트롤 */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20", // z-20 ★
          "bg-gradient-to-t from-black/70 via-black/30 to-transparent",
          "pt-20 pb-3 px-4 transition-opacity",
          showUI || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {/* 진행 바(버퍼 + 재생) */}
        <div className="pointer-events-auto mb-3">
          <div
            className="relative h-2 w-full cursor-pointer"
            onClick={onSeekByPointer}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={current}
            aria-label="进度"
          >
            <div className="absolute inset-0 rounded-full bg-white/20" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/35"
              style={{ width: `${bufferFrac * 100}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white"
              style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-white/80 tabular-nums">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 컨트롤 바 */}
        <div className="pointer-events-auto flex items-center justify-between">
          {/* 좌측: 재생/일시정지 + 음소거 + 볼륨 */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay() }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
              aria-label="播放/暂停"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* 🔊 볼륨 컨트롤 */}
<div className="flex items-center gap-2 w-36">
  {/* 볼륨 아이콘 */}
  <button
    onClick={(e) => {
      e.stopPropagation()
      onVolume(muted ? 50 : 0)
    }}
    className="flex h-10 w-10 items-center justify-center rounded-full
               bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
    aria-label="音量"
  >
    {volume === 0 ? (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
        <path d="M16.5 12l3.5 3.5-1.5 1.5L15 13.5 11.5 17l-1.5-1.5L13.5 12 10 8.5 11.5 7 15 10.5l3.5-3.5 1.5 1.5L16.5 12zM3 10v4h4l5 5V5L7 10H3z"/>
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
        <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06a4.49 4.49 0 002.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
    )}
  </button>

  {/* 볼륨 슬라이더 (항상 표시) */}
  <input
    type="range"
    min={0}
    max={100}
    value={volume}
    onChange={(e) => onVolume(Number(e.target.value))}
    className="
      h-1 flex-1 cursor-pointer appearance-none
      rounded bg-white/25 accent-white
    "
  />
</div>
          </div>
          {/* 우측: 배속 + 전체화면 */}
<div className="flex items-center gap-2">

  {/* ▶️ 배속 버튼 */}
<div
  className="relative pointer-events-auto"
  onClick={(e) => {
    e.stopPropagation()
    setRateOpen((v) => !v)
  }}
>
  <button
    className="flex h-10 px-3 items-center justify-center rounded-full
               bg-white/10 ring-1 ring-white/20 hover:bg-white/20
               text-white text-sm tabular-nums"
  >
    {playbackRate}x
  </button>

  {/* 배속 리스트 */}
  {rateOpen && (
    <div
      className="
        absolute bottom-full right-0 mb-2
        flex flex-col
        rounded-lg bg-black/70 backdrop-blur
        ring-1 ring-white/20
        z-30
      "
      onClick={(e) => e.stopPropagation()}
    >
      {playbackRates.map((r) => (
        <button
          key={r}
          onClick={() => {
            changePlaybackRate(r)
            setRateOpen(false)
          }}
          className={cn(
            "px-4 py-2 text-sm text-white hover:bg-white/20 text-left",
            r === playbackRate && "bg-white/20"
          )}
        >
          {r}x
        </button>
      ))}
    </div>
  )}
</div>


  {/* 기존 전체화면 버튼 (원본 그대로) */}
  <button
    onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
    aria-label={isFs ? "退出全屏" : "全屏"}
            >
              {isFs ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M14 10V4h6v2h-4v4h-2zM4 10V4h6v2H6v4H4zm10 10v-6h2v4h4v2h-6zM4 20v-6h2v4h4v2H4z" />
                </svg>
              ) : (
               <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M10 4v2H6v4H4V4h6zm10 6h-2V6h-4V4h6v6zM4 14h2v4h4v2H4v-6zm16 6h-6v-2h4v-4h2v6z" />
               </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
