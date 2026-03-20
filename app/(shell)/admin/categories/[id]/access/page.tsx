"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CategoryAccessPage() {
  const params = useParams()
  const categoryId = params?.id as string
  const supabase = createClient()

  const [students, setStudents] = useState<any[]>([])
  const [accessList, setAccessList] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 🔥 root 카테고리 찾기 (ML)
  const getRootCategoryId = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, parent_id")
      .eq("id", categoryId)
      .single()

    if (error) {
      console.error("Category fetch error:", error)
      return null
    }

    const rootId = data.parent_id ? data.parent_id : data.id
    console.log("ROOT CATEGORY ID:", rootId)
    return rootId
  }

  // 🔥 학생 목록
  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, role")

    if (error) {
      console.error("Students fetch error:", error)
      return
    }

    const onlyStudents = data?.filter((p) => p.role === "student") || []
    console.log("STUDENTS:", onlyStudents)

    setStudents(onlyStudents)
  }

  // 🔥 권한 목록
  const fetchAccessList = async () => {
    const rootId = await getRootCategoryId()
    if (!rootId) return

    const { data, error } = await supabase
      .from("category_access")
      .select("id, student_id, profiles(name)")
      .eq("category_id", rootId)

    if (error) {
      console.error("Access list error:", error)
      return
    }

    setAccessList(data || [])
  }

  useEffect(() => {
    fetchStudents()
    fetchAccessList()
  }, [categoryId])

  const handleAddAccess = async () => {
    if (!selectedStudent) return
    setLoading(true)

    const rootId = await getRootCategoryId()
    if (!rootId) {
      alert("Root category not found")
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from("category_access")
      .select("id")
      .eq("category_id", rootId)
      .eq("student_id", selectedStudent)
      .maybeSingle()

    if (existing) {
      alert("该学生已经有权限")
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from("category_access")
      .insert({
        category_id: rootId,
        student_id: selectedStudent,
      })

    if (error) {
      console.error("Insert error:", error)
      alert("添加失败: " + error.message)
    } else {
      console.log("ACCESS ADDED")
      setSelectedStudent(null)
      fetchAccessList()
    }

    setLoading(false)
  }

  const handleRemoveAccess = async (id: string) => {
    if (!confirm("确定要移除这个权限吗？")) return

    const { error } = await supabase
      .from("category_access")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete error:", error)
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

          <div className="flex gap-2">
            <Select
              value={selectedStudent ?? ""}
              onValueChange={setSelectedStudent}
            >
              <SelectTrigger className="w-[300px]">
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

          <div>
            <h3 className="font-semibold mb-2">已授权学生</h3>
            <ul className="space-y-2 text-sm">
              {accessList.length === 0 && (
                <li className="text-muted-foreground">暂无授权学生</li>
              )}

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
