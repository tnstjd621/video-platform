// components/EmptyState.tsx
export function EmptyState(
  { title, desc, cta }: { title: string; desc?: string; cta?: React.ReactNode }
) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <div className="text-lg font-medium">{title}</div>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )
}
