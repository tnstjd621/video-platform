// app/layout.tsx
import "./globals.css"
import type { ReactNode } from "react"

export const metadata = {
  title: "E-Campus",
  description: "在线学习平台",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
