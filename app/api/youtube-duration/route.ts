// app/api/youtube-duration/route.ts
// YouTube URL을 받아서 duration(초)을 반환하는 API Route

import { NextRequest, NextResponse } from "next/server"

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "").split("?")[0]
    if (u.pathname.startsWith("/watch")) return u.searchParams.get("v")
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2]
    return null
  } catch {
    return null
  }
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const h = parseInt(match[1] || "0")
  const m = parseInt(match[2] || "0")
  const s = parseInt(match[3] || "0")
  return h * 3600 + m * 60 + s
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "url 파라미터 필요" }, { status: 400 })

  const ytId = extractYouTubeId(url)
  if (!ytId) return NextResponse.json({ error: "유효하지 않은 YouTube URL" }, { status: 400 })

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ error: "YOUTUBE_API_KEY 환경변수 없음" }, { status: 500 })

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ytId}&key=${apiKey}`
  const res = await fetch(apiUrl)
  const json = await res.json()

  if (json.error) {
    return NextResponse.json({ error: json.error.message }, { status: 500 })
  }

  const item = json.items?.[0]
  if (!item) return NextResponse.json({ error: "영상을 찾을 수 없음" }, { status: 404 })

  const duration = parseDuration(item.contentDetails.duration)
  return NextResponse.json({ duration })
}