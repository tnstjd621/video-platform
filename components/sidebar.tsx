"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, UserCircle2, Users2, Video, Upload, Layers, GraduationCap,
  BarChart2, Megaphone, UserPlus2, BookOpenText, Bell, ClipboardList
} from "lucide-react"
import * as React from "react"

type Role = "owner" | "administrator" | "supervisor" | "student"

const item = (href: string, label: string, Icon: React.ElementType) => ({ href, label, Icon })
const section = (title: string, children: any[]) => ({ title, children })

const NAV_BY_ROLE: Record<Role, Array<{title:string; children:Array<{href:string;label:string;Icon:any}>}>> = {
  owner: [
    section("常用", [
      item("/dashboard", "仪表盘", LayoutDashboard),
      item("/profile", "账户", UserCircle2),
    ]),
    section("管理", [
      item("/admin/users", "账户管理", Users2),
      item("/admin/videos", "视频管理", Video),
      item("/admin/categories", "分类管理", Layers),
      item("/admin/videos/upload", "上传课程", Upload),
      item("/admin/classrooms", "班级管理", GraduationCap),
      item("/admin/progress", "学习进度", BarChart2),
      item("/admin/announcements", "公告", Megaphone),
      item("/admin/create-user", "创建账户", UserPlus2),
    ]),
  ],
  administrator: [
    section("常用", [
      item("/dashboard", "仪表盘", LayoutDashboard),
      item("/profile", "账户", UserCircle2),
    ]),
    section("管理", [
      item("/admin/users", "账户管理", Users2),
      item("/admin/videos", "视频管理", Video),
      item("/admin/categories", "分类管理", Layers),
      item("/admin/videos/upload", "上传课程", Upload),
      item("/admin/classrooms", "班级管理", GraduationCap),
      item("/admin/progress", "学习进度", BarChart2),
    ]),
  ],
  supervisor: [
    section("常用", [
      item("/dashboard", "仪表盘", LayoutDashboard),
      item("/profile", "账户", UserCircle2),
    ]),
    section("班主任", [
      item("/supervisor/classrooms", "我的班级", GraduationCap),
      item("/supervisor/announcements", "班级公告", Megaphone),
      item("/supervisor/progress", "学生进度", BarChart2),
      item("/announcements", "系统公告", Bell),
    ]),
  ],
  student: [
    section("常用", [
      item("/dashboard", "仪表盘", LayoutDashboard),
      item("/profile", "账户", UserCircle2),
    ]),
    section("学习", [
      item("/courses", "我的课程", BookOpenText),
      item("/progress", "我的进度", ClipboardList),
      item("/classrooms", "我的班级", GraduationCap),
      item("/announcements", "公告", Megaphone),
    ]),
  ],
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const nav = NAV_BY_ROLE[role]

  return (
    <aside
      className="
        fixed left-0 top-0 z-40 h-screen w-[92px] md:w-[150px]
        text-[var(--sidebar-fg)] bg-[var(--brand)]
        border-r border-black/10 shadow-xl
      "
    >


      {/* 스크롤 가능한 네비 */}
      <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-2 md:px-3 py-3 space-y-4">
        {nav.map((sec) => (
          <div key={sec.title}>
            <div className="hidden md:block px-2 text-xs/5 uppercase tracking-wide opacity-80 mb-2">
              {sec.title}
            </div>
            <div className="grid gap-1.5">
              {sec.children.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/")
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      "bg-white/0 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                      active ? "bg-white/15" : "",
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="hidden md:inline text-sm">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
