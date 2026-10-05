import type { ReactNode } from 'react'

type Tone = 'default' | 'danger' | 'warning' | 'success' | 'brand'

const toneText: Record<Tone, string> = {
  default: 'text-content-primary',
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
  brand: 'text-content-primary',
}

/** Compact dashboard metric cell: large value over an uppercase label. */
export default function MetricCard({
  value,
  label,
  tone = 'default',
  hint,
  footer,
}: {
  value: ReactNode
  label: string
  tone?: Tone
  hint?: string
  footer?: ReactNode
}) {
  return (
    <div className="min-w-[74px] rounded-xl border border-border bg-bg-elevated px-3 py-2 shadow-card transition-colors hover:border-border-strong">
      <div className={`font-mono text-lg font-semibold leading-none ${toneText[tone]}`}>{value}</div>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-content-muted">
        {label}
        {hint && <span className="normal-case text-content-muted/70">· {hint}</span>}
      </div>
      {footer}
    </div>
  )
}
