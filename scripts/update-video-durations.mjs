// scripts/update-video-durations.mjs
// 사용법:
// 1. pnpm add -D @supabase/supabase-js (이미 있으면 생략)
// 2. 아래 YOUTUBE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY 채우기
// 3. node scripts/update-video-durations.mjs

import { createClient } from "@supabase/supabase-js"

// ✅ 여기에 값 채우기
const YOUTUBE_API_KEY = "AIzaSyA68MiSUITQO8I3lxMhhGgcWKBnC8OcCJg"
const SUPABASE_URL = "https://pijjlrazzwdpddnsnvuv.supabase.co"         // https://xxxx.supabase.co
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpampscmF6endkcGRkbnNudnV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0OTMyNiwiZXhwIjoyMDY4MzI1MzI2fQ.Q_94URnYo0uRUdjUp0bXaO-BvGmPGTeaLJhxgBw0VAk" // Settings > API > service_role

// ---------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// youtu.be/VIDEO_ID 또는 youtube.com/watch?v=VIDEO_ID 에서 ID 추출
function extractYouTubeId(url) {
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

// ISO 8601 duration (PT1H6M30S) → 초 변환
function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const h = parseInt(match[1] || "0")
  const m = parseInt(match[2] || "0")
  const s = parseInt(match[3] || "0")
  return h * 3600 + m * 60 + s
}

async function main() {
  console.log("🔍 duration이 없는 영상 조회 중...")

  // duration이 NULL인 영상 전체 가져오기
  const { data: videos, error } = await supabase
    .from("videos")
    .select("id, title, url")
    .is("duration", null)
    .not("url", "is", null)

  if (error) {
    console.error("❌ 영상 조회 실패:", error.message)
    process.exit(1)
  }

  console.log(`📹 총 ${videos.length}개 영상 처리 시작\n`)

  // YouTube ID 추출
  const videoMap = []
  for (const v of videos) {
    const ytId = extractYouTubeId(v.url)
    if (ytId) videoMap.push({ ...v, ytId })
    else console.warn(`⚠️  YouTube ID 추출 실패: ${v.title} (${v.url})`)
  }

  // YouTube API는 한 번에 최대 50개 처리 가능
  const chunkSize = 50
  let updated = 0
  let failed = 0

  for (let i = 0; i < videoMap.length; i += chunkSize) {
    const chunk = videoMap.slice(i, i + chunkSize)
    const ids = chunk.map((v) => v.ytId).join(",")

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${YOUTUBE_API_KEY}`

    const res = await fetch(apiUrl)
    const json = await res.json()

    if (json.error) {
      console.error("❌ YouTube API 오류:", json.error.message)
      process.exit(1)
    }

    const ytItems = json.items || []

    for (const video of chunk) {
      const ytItem = ytItems.find((item) => item.id === video.ytId)
      if (!ytItem) {
        console.warn(`⚠️  YouTube에서 찾을 수 없음: ${video.title} (${video.ytId})`)
        failed++
        continue
      }

      const durationSec = parseDuration(ytItem.contentDetails.duration)

      const { error: updateError } = await supabase
        .from("videos")
        .update({ duration: durationSec })
        .eq("id", video.id)

      if (updateError) {
        console.error(`❌ 업데이트 실패: ${video.title} - ${updateError.message}`)
        failed++
      } else {
        const m = Math.floor(durationSec / 60)
        const s = durationSec % 60
        console.log(`✅ ${video.title}: ${m}:${s.toString().padStart(2, "0")} (${durationSec}초)`)
        updated++
      }
    }

    // API 속도 제한 방지
    if (i + chunkSize < videoMap.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log(`\n🎉 완료! 성공: ${updated}개 / 실패: ${failed}개`)
}

main()
