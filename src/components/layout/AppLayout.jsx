import { useAuth } from '@/context/AuthContext'
import { getInitials } from '@/utils/helpers'

/**
 * Page-level layout: breadcrumb bar + title strip + content slot.
 * Sidebar lives in AppShell (persistent parent) — not here.
 */
export function AppLayout({ title, breadcrumbs = [], subtitle, actions, children }) {
  const { user } = useAuth()
  const initials = getInitials(user?.name)

  return (
    <>
      {/* Top breadcrumb bar */}
      <header className="flex h-12 items-center justify-between border-b border-surface-200 bg-white px-4 md:px-8">
        <nav className="flex items-center gap-2 text-xs text-surface-500">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-surface-300">›</span>}
              <span className={i === breadcrumbs.length - 1 ? 'text-surface-900 font-medium' : ''}>
                {b}
              </span>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-semibold text-surface-900">{user?.name || 'User'}</div>
            <div className="text-[10px] uppercase tracking-wide text-surface-500">
              {user?.role || ''}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bhoomi-600 text-xs font-semibold text-white">
            {initials}
          </div>
        </div>
      </header>

      {/* Title strip — brand navy band */}
      {title && (
        <div className="bg-gradient-to-r from-bhoomi-800 to-bhoomi-600 px-4 py-6 md:px-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-wide text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-xs text-white/70">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      <main className="flex-1 animate-fade-in">{children}</main>
    </>
  )
}

export default AppLayout
