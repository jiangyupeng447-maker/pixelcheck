/** Circular progress ring for the Visual QA Health score (0..100). */
export default function QAHealth({ score, size = 56 }: { score: number; size?: number }) {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (s / 100) * c
  const color = s >= 80 ? '#22C55E' : s >= 60 ? '#8C82E8' : s >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6E8E3" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ transition: 'stroke-dasharray 500ms ease, stroke 300ms ease' }}
          />
        </svg>
        <span className="absolute font-mono text-sm font-bold" style={{ color }}>
          {s}
        </span>
      </div>
      <div className="leading-tight">
        <div className="text-[11px] font-semibold text-content-primary">Visual QA</div>
        <div className="text-[10px] uppercase tracking-wider text-content-muted">Health</div>
      </div>
    </div>
  )
}
