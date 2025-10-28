"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CategoryAccessPage() {
  const params = useParams()
  const categoryId = params?.id as string
  const supabase = createClient()

  const [students, setStudents] = useState<any[]>([])
  const [accessList, setAccessList] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 학생 목록 가져오기
  const fetchStudents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "student")
    setStudents(data || [])
  }

  // 권한 목록 가져오기
  const fetchAccessList = async () => {
    const { data } = await supabase
      .from("category_access")
      .select("id, student_id, profiles(name)")
      .eq("category_id", categoryId)
    setAccessList(data || [])
  }

  useEffect(() => {
    fetchStudents()
    fetchAccessList()
  }, [categoryId])

  // 권한 추가
  const handleAddAccess = async () => {
    if (!selectedStudent) return
    setLoading(true)
    const { error } = await supabase.from("category_access").insert({
      category_id: categoryId,
      student_id: selectedStudent,
    })
    if (error) {
      alert("添加失败: " + error.message)
    } else {
      setSelectedStudent(null)
      fetchAccessList()
    }
    setLoading(false)
  }

  // 권한 삭제
  const handleRemoveAccess = async (id: string) => {
    if (!confirm("确定要移除这个权限吗？")) return
    const { error } = await supabase.from("category_access").delete().eq("id", id)
    if (error) {
      alert("删除失败: " + error.message)
    } else {
      fetchAccessList()
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>分类访问管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 학생 선택 & 권한 추가 */}
          <div className="flex gap-2">
            <Select value={selectedStudent ?? ""} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="学生选择" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddAccess} disabled={loading}>
              {loading ? "添加中..." : "添加权限"}
            </Button>
          </div>

          {/* 권한 리스트 */}
          <div>
            <h3 className="font-semibold mb-2">已授权学生</h3>
            <ul className="space-y-2 text-sm">
              {accessList.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center border p-2 rounded"
                >
                  <span>{item.profiles?.name || item.student_id}</span>
                  <Button
                    variant="destructive"
                    onClick={() => handleRemoveAccess(item.id)}
                  >
                    移除
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
