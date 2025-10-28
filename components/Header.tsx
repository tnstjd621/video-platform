import Link from "next/link"
import {LogoutButton} from "@/components/logout-button"

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background border-b">
      <Link href="/dashboard" className="text-xl font-bold">
        E-Campus
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/courses">课程</Link>
        <Link href="/dashboard">仪表板</Link>
        <LogoutButton />
      </nav>
    </header>
  )
}
