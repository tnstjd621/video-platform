"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const confirmOwnerEmail = async () => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = createClient()

      // 현재 로그인된 사용자가 있는지 확인
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // 먼저 로그인 시도
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: "owner@ecampus.com",
          password: "ChangeMe123!",
        })

        if (loginError) {
          throw new Error(`로그인 실패: ${loginError.message}`)
        }

        if (loginData.user) {
          setMessage("Owner 계정으로 로그인되었습니다! 이제 시스템을 사용할 수 있습니다.")
          setTimeout(() => router.push("/dashboard"), 2000)
          return
        }
      }

      setMessage("이미 로그인되어 있습니다. 대시보드로 이동합니다.")
      setTimeout(() => router.push("/dashboard"), 2000)
    } catch (error: unknown) {
      console.error("[v0] 이메일 확인 오류:", error)
      setError(error instanceof Error ? error.message : "로그인에 실패했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  const createOwnerAccountDirect = async () => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = createClient()

      // 먼저 기존 계정이 있는지 확인
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", "owner@ecampus.com")
        .single()

      if (existingUser) {
        setMessage("Owner 계정이 이미 존재합니다. 로그인을 시도해보세요.")
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "owner@ecampus.com",
        password: "ChangeMe123!",
        options: {
          emailRedirectTo: undefined,
          data: {
            email_confirm: false, // 이메일 확인 건너뛰기
          },
        },
      })

      if (authError) {
        throw new Error(`계정 생성 실패: ${authError.message}`)
      }

      if (authData.user) {
        // 프로필 생성
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          email: "owner@ecampus.com",
          full_name: "System Owner",
          role: "owner",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error("[v0] 프로필 생성 오류:", profileError)
        }

        setMessage("Owner 계정이 성공적으로 생성되었습니다! 로그인을 시도해보세요.")
      }
    } catch (error: unknown) {
      console.error("[v0] 클라이언트 계정 생성 오류:", error)
      setError(error instanceof Error ? error.message : "계정 생성에 실패했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">시스템 설정</CardTitle>
          <CardDescription>Owner 계정을 생성합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>다음 계정이 생성됩니다:</p>
            <p>
              <strong>이메일:</strong> owner@ecampus.com
            </p>
            <p>
              <strong>비밀번호:</strong> ChangeMe123!
            </p>
          </div>

          {message && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</div>}

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="space-y-2">
            <Button
              onClick={createOwnerAccountDirect}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? "계정 생성 중..." : "Owner 계정 생성"}
            </Button>

            <Button onClick={confirmOwnerEmail} variant="secondary" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 시도 중..." : "Owner 계정으로 로그인"}
            </Button>
          </div>

          <Button onClick={() => router.push("/auth/login")} variant="outline" className="w-full">
            로그인 페이지로 이동
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
