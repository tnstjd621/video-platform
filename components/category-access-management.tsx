"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  categoryId: string
}

export function CategoryAccessManagement({ categoryId }: Props) {
  const supabase = createClient()
  const [accessList, setAccessList] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isTopCategory, setIsTopCategory] = useState<boolean>(false)

  // 检查该分类是否为顶级分类
  const checkIfTopCategory = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("parent_id")
      .eq("id", categoryId)
      .single()

    if (!error && data) {
      setIsTopCategory(data.parent_id === null)
    }
  }

  // 权限列表
  const fetchAccess = async () => {
    const { data, error } = await supabase
      .from("category_access")
      .select("id, student_id, profiles(email)")
      .eq("category_id", categoryId)

    if (!error) setAccessList(data || [])
  }

  // 学生列表 (role = student)
  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("role", "student")

    if (!error) setStudents(data || [])
  }

  useEffect(() => {
    fetchAccess()
    fetchStudents()
    checkIfTopCategory()
  }, [categoryId])

  // 权限授予
  const handleGrant = async () => {
    if (!selectedStudent) {
      alert("请选择学生")
      return
    }

    // 检查是否已存在
    const alreadyExists = accessList.some((a) => a.student_id === selectedStudent)
    if (alreadyExists) {
      alert("该学生已被授予访问权限")
      return
    }

    setLoading(true)

    const { error } = await supabase.from("category_access").insert({
      category_id: categoryId,
      student_id: selectedStudent,
    })

    if (error) {
      alert("错误: " + error.message)
    } else {
      alert("权限已成功授予！")
      setSelectedStudent(null)
      fetchAccess()
    }

    setLoading(false)
  }

  // 权限删除
  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("category_access").delete().eq("id", id)
    if (error) {
      alert("删除失败: " + error.message)
    } else {
      alert("权限已删除")
      fetchAccess()
    }
  }

  // 搜索过滤
  const filteredStudents = students.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  // 如果是子分类 → 不允许管理权限
  if (!isTopCategory) {
    return (
      <div className="p-4 border rounded bg-muted">
        <p className="text-sm text-muted-foreground">
          ⚠️ 只能在 <strong>顶级分类</strong> 中管理学生权限。<br />
          当前分类是子分类，权限继承自它的上级分类。
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">已授予的学生</h2>
      <ul className="space-y-2">
        {accessList.length > 0 ? (
          accessList.map((a) => (
            <li key={a.id} className="flex justify-between items-center border-b pb-1">
              <span>{a.profiles?.email || a.student_id}</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRevoke(a.id)}
              >
                删除
              </Button>
            </li>
          ))
        ) : (
          <p>尚未授予任何学生</p>
        )}
      </ul>

      <div className="mt-6 space-y-2">
        <Input
          placeholder="搜索学生邮箱"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-40 overflow-y-auto border rounded p-2">
          {filteredStudents.map((s) => (
            <div
              key={s.id}
              className={`p-2 cursor-pointer rounded ${
                selectedStudent === s.id ? "bg-primary text-white" : "hover:bg-gray-100"
              }`}
              onClick={() => setSelectedStudent(s.id)}
            >
              {s.email}
            </div>
          ))}
        </div>
        <Button onClick={handleGrant} disabled={loading || !selectedStudent}>
          {loading ? "处理中..." : "授予权限"}
        </Button>
      </div>
    </div>
  )
}
