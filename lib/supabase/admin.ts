// lib/supabase/admin.ts
// API Route, Server Component, Route Handler 등 서버 환경에서만 import 하세요.

import { createClient, SupabaseClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  )
}

// 싱글톤 보장: 핫리로드/중복 임포트 시에도 한 번만 생성
let _admin: SupabaseClient | null =
  // @ts-ignore
  globalThis.__ADMIN_SUPABASE__ ?? null

if (!_admin) {
  _admin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  // @ts-ignore
  globalThis.__ADMIN_SUPABASE__ = _admin
}

/** 서버 전용 Supabase Admin 클라이언트 (Service Role) */
export const adminSupabase = _admin

/** 필요하면 새 인스턴스가 필요할 때 호출용 팩토리 (대부분은 adminSupabase를 쓰면 충분) */
export function createAdminClient() {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
