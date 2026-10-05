import { NavLink } from 'react-router-dom'
import { Logo, IconGrid, IconCompare, IconPlus } from './icons'

const navItems = [
  { to: '/reviews', label: 'Reviews', icon: IconGrid },
  { to: '/compare', label: 'Compare', icon: IconCompare },
  { to: '/new', label: 'New Review', icon: IconPlus },
]

export default function Sidebar() {
  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col bg-sidebar px-4 py-5 text-white">
      <div className="flex items-center gap-2.5 px-1">
        <Logo className="h-8 w-8" />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-white">PixelCheck</div>
          <div className="text-[10px] font-medium text-white/45">Design → Code Visual QA</div>
        </div>
      </div>

      <nav className="mt-7 flex flex-col gap-1">
        <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Workspace</div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-white text-content-primary' : 'text-white/70 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-brand" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-sidebar-hover px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand to-accent2" />
        <div className="leading-tight">
          <div className="text-xs font-medium text-white">Workspace</div>
          <div className="text-[10px] text-white/45">Local · Demo</div>
        </div>
      </div>
    </aside>
  )
}
