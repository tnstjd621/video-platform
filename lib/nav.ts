import {
  LayoutDashboard, UserCircle2, Users2, Video, Upload, Layers, GraduationCap,
  BarChart2, Megaphone, UserPlus2, BookOpenText, Bell, ClipboardList
} from "lucide-react"

export type Role = "owner" | "administrator" | "supervisor" | "student"
export type NavItem = { href: string; label: string; Icon?: any; desc?: string }
export type NavSection = { title: string; children: NavItem[] }

const item = (href: string, label: string, Icon?: any, desc?: string): NavItem => ({ href, label, Icon, desc })
const section = (title: string, children: NavItem[]): NavSection => ({ title, children })

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  owner: [
    section("常用", [
      item("/dashboard", "仪表盘", LayoutDashboard, "总览与快速入口"),
      item("/profile", "账户", UserCircle2, "查看与修改个人资料"),
    ]),
    section("管理", [
      item("/admin/users", "账户管理", Users2, "查看/编辑/分配角色"),
      item("/admin/videos", "视频管理", Video, "管理与编辑视频"),
      item("/admin/categories", "分类管理", Layers, "维护课程分类"),
      item("/admin/videos/upload", "上传课程", Upload, "上传新的课程视频"),
      item("/admin/classrooms", "班级管理", GraduationCap, "创建与管理班级"),
      item("/admin/progress", "学习进度", BarChart2, "查看学生进度"),
      item("/admin/announcements", "公告", Megaphone, "发布系统/班级公告"),
      item("/admin/create-user", "创建账户", UserPlus2, "创建新用户"),
    ]),
  ],
  administrator: [
    section("常用", [
      item("/dashboard", "仪表盘", LayoutDashboard, "总览与快速入口"),
      item("/profile", "账户", UserCircle2, "查看与修改个人资料"),
    ]),
    section("管理", [
      item("/admin/users", "账户管理", Users2, "查看/编辑/分配角色"),
      item("/admin/videos", "视频管理", Video, "管理与编辑视频"),
      item("/admin/categories", "分类管理", Layers, "维护课程分类"),
      item("/admin/videos/upload", "上传课程", Upload, "上传新的课程视频"),
      item("/admin/classrooms", "班级管理", GraduationCap, "创建与管理班级"),
      item("/admin/progress", "学习进度", BarChart2, "查看学生进度"),
    ]),
  ],
  supervisor: [
    section("常用", [
      item("/dashboard", "仪表盘", LayoutDashboard, "总览与快速入口"),
      item("/profile", "账户", UserCircle2, "查看与修改个人资料"),
    ]),
    section("班主任", [
      item("/supervisor/classrooms", "我的班级", GraduationCap, "管理所负责的班级"),
      item("/supervisor/announcements", "班级公告", Megaphone, "发布与管理班级公告"),
      item("/supervisor/progress", "学生进度", BarChart2, "查看本班学生进度"),
      item("/announcements", "系统公告", Bell, "查看平台公告"),
    ]),
  ],
  student: [
    section("常用", [
      item("/dashboard", "仪表盘", LayoutDashboard, "总览与快速入口"),
      item("/profile", "账户", UserCircle2, "查看与修改个人资料"),
    ]),
    section("学习", [
      item("/courses", "我的课程", BookOpenText, "进入已获授权课程"),
      item("/progress", "我的进度", ClipboardList, "查看学习进度与统计"),
      item("/classrooms", "我的班级", GraduationCap, "查看班级与公告"),
      item("/announcements", "公告", Megaphone, "查看系统/班级公告"),
    ]),
  ],
}
