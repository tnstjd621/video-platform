// lib/format.ts
export const fmtNum = (n:number) => new Intl.NumberFormat("zh-CN").format(n)
export const fmtDate = (d:Date|string|number) =>
  new Intl.DateTimeFormat("zh-CN", { dateStyle:"medium", timeStyle:"short" }).format(new Date(d))
