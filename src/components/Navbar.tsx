import { NavLink, useNavigate } from 'react-router-dom'
import { Logo, IconGrid, IconCompare, IconPlus } from './icons'

const navItems = [
  { to: '/reviews', label: 'Reviews', icon: IconGrid },
  { to: '/compare', label: 'Compare', icon: IconCompare },
]

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-6 border-b border-border bg-bg-surface/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <Logo className="h-7 w-7" />
        <div className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight">PixelCheck</span>
          <span className="block text-[10px] font-medium text-content-muted">
            Design → Code Visual QA
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-bg-hover text-content-primary'
                  : 'text-content-secondary hover:bg-bg-hover hover:text-content-primary'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button className="btn-primary" onClick={() => navigate('/new')}>
          <IconPlus className="h-4 w-4" />
          New Review
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand to-purple-500 ring-2 ring-bg-surface" />
      </div>
    </header>
  )
}
