import { useState } from 'react'
import { mockScreens } from '../../data/mockData'
import type { Screen } from '../../types'

function ScreenStatus({ issues }: { issues: number }) {
  if (issues === 0) {
    return <span className="text-xs font-medium text-success">Passed</span>
  }
  return (
    <span className="text-xs font-medium text-danger">
      {issues} {issues === 1 ? 'Issue' : 'Issues'}
    </span>
  )
}

export default function ScreenNavigator() {
  const [active, setActive] = useState<string>(mockScreens[0].id)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Screens</h2>
        <p className="mt-0.5 text-xs text-content-muted">Checkout Page · {mockScreens.length} screens</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {mockScreens.map((s: Screen) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            data-active={active === s.id}
            className="group mb-1 flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-colors hover:bg-bg-hover data-[active=true]:border-border data-[active=true]:bg-bg-hover"
          >
            <span className="w-6 shrink-0 font-mono text-xs text-content-muted group-data-[active=true]:text-content-primary">
              {s.index}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-content-secondary group-data-[active=true]:text-content-primary">
                {s.name}
              </p>
              <div className="mt-0.5">
                <ScreenStatus issues={s.issues} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <p className="text-center text-[11px] text-content-muted">Design → Code Visual QA</p>
      </div>
    </aside>
  )
}
