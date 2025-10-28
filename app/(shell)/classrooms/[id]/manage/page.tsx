"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ClassroomManagePage() {
  const params = useParams()
  const classroomId = params?.id as string
  const supabase = createClient()

  const [students, setStudents] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [classroomStudents, setClassroomStudents] = useState<any[]>([])
  const [classroomSupervisors, setClassroomSupervisors] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("")

  const fetchData = async () => {
    const { data: s } = await supabase.from("profiles").select("id, name").eq("role", "student")
    const { data: sp } = await supabase.from("profiles").select("id, name").eq("role", "supervisor")
    const { data: cs } = await supabase.from("classroom_students").select("id, student_id, profiles(name)").eq("classroom_id", classroomId)
    const { data: csp } = await supabase.from("classroom_supervisors").select("id, supervisor_id, profiles(name)").eq("classroom_id", classroomId)

    setStudents(s || [])
    setSupervisors(sp || [])
    setClassroomStudents(cs || [])
    setClassroomSupervisors(csp || [])
  }

  useEffect(() => {
    fetchData()
  }, [classroomId])

  const addStudent = async () => {
    if (!selectedStudent) return
    const { error } = await supabase.from("classroom_students").insert({
      classroom_id: classroomId,
      student_id: selectedStudent,
    })
    if (!error) fetchData()
  }

  const addSupervisor = async () => {
    if (!selectedSupervisor) return
    const { error } = await supabase.from("classroom_supervisors").insert({
      classroom_id: classroomId,
      supervisor_id: selectedSupervisor,
    })
    if (!error) fetchData()
  }

  const removeStudent = async (id: string) => {
    const { error } = await supabase.from("classroom_students").delete().eq("id", id)
    if (!error) fetchData()
  }

  const removeSupervisor = async (id: string) => {
    const { error } = await supabase.from("classroom_supervisors").delete().eq("id", id)
    if (!error) fetchData()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>班级成员管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 学生管理 */}
          <div>
            <h3 className="font-semibold mb-2">学生</h3>
            <div className="flex gap-2 mb-2">
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="选择学生" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addStudent}>添加</Button>
            </div>
            <ul>
              {classroomStudents.map((s) => (
                <li key={s.id} className="flex justify-between">
                  {s.profiles?.name}
                  <Button variant="destructive" onClick={() => removeStudent(s.id)}>移除</Button>
                </li>
              ))}
            </ul>
          </div>

          {/* 管理员管理 */}
          <div>
            <h3 className="font-semibold mb-2">班级管理员</h3>
            <div className="flex gap-2 mb-2">
              <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                <SelectTrigger>
                  <SelectValue placeholder="选择管理员" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addSupervisor}>添加</Button>
            </div>
            <ul>
              {classroomSupervisors.map((s) => (
                <li key={s.id} className="flex justify-between">
                  {s.profiles?.name}
                  <Button variant="destructive" onClick={() => removeSupervisor(s.id)}>移除</Button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
