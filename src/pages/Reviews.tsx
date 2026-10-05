import { useNavigate } from 'react-router-dom'
import { mockReviews } from '../data/mockData'
import type { Review } from '../types'
import { IconPlus, IconCompare, IconCheck, IconAlert } from '../components/icons'

const statusStyles: Record<
  Review['status'],
  { label: string; className: string; icon: typeof IconCheck }
> = {
  passed: {
    label: 'Passed',
    className: 'text-success bg-success/10 border-success/20',
    icon: IconCheck,
  },
  issues: {
    label: 'Issues',
    className: 'text-danger bg-danger/10 border-danger/20',
    icon: IconAlert,
  },
  'in-review': {
    label: 'In Review',
    className: 'text-warning bg-warning/10 border-warning/20',
    icon: IconCompare,
  },
}

function StatusBadge({ status }: { status: Review['status'] }) {
  const s = statusStyles[status]
  const Icon = s.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  )
}

export default function Reviews() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-6 py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
          <p className="mt-1 text-sm text-content-secondary">
            Design → Code Visual QA. Catch spacing, sizing, color, alignment and visual
            inconsistencies before handoff.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/new')}>
          <IconPlus className="h-4 w-4" />
          New Review
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {mockReviews.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate('/compare')}
            className="card group flex flex-col gap-4 p-5 text-left transition-all hover:border-border-strong hover:bg-bg-elevated"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-bg-elevated text-content-secondary group-hover:text-content-primary">
                  <IconCompare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium leading-tight">{r.title}</h3>
                  <p className="mt-0.5 text-xs text-content-muted">
                    {r.author} · Updated {r.updatedAt}
                  </p>
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>

            <div className="flex items-center justify-between border-t border-border-subtle pt-3">
              <span className="text-sm text-content-secondary">
                {r.issues > 0 ? (
                  <>
                    <span className="font-semibold text-content-primary">{r.issues}</span> visual{' '}
                    {r.issues === 1 ? 'issue' : 'issues'}
                  </>
                ) : (
                  'No issues found'
                )}
              </span>
              <span className="text-sm font-medium text-content-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
