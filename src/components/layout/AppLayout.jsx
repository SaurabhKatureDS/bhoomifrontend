import { useAuth } from '@/context/AuthContext'
import { useSidebar } from '@/context/SidebarContext'
import { getInitials, cn } from '@/utils/helpers'
import { Menu } from 'lucide-react'

/**
 * Page-level layout: breadcrumb bar + title strip + content slot.
 * Sidebar lives in AppShell (persistent parent) — not here.
 */
export function AppLayout({ title, breadcrumbs = [], subtitle, actions, children }) {
  const { user } = useAuth()
  const { onMenuToggle } = useSidebar()
  const initials = getInitials(user?.name)

  return (
    <>
      {/* Top breadcrumb bar */}
      <header className="flex h-12 items-center justify-between border-b border-surface-200 bg-white px-4 md:px-8">
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={onMenuToggle}
            className="mr-1 shrink-0 rounded-lg p-1.5 text-surface-600 hover:bg-surface-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <nav className="flex items-center gap-2 text-xs text-surface-500 overflow-hidden">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-2 shrink-0">
                {i > 0 && <span className="text-surface-300">›</span>}
                <span className={cn(
                  i === breadcrumbs.length - 1 ? 'text-surface-900 font-medium' : '',
                  i === 0 ? 'hidden sm:inline' : ''
                )}>
                  {b}
                </span>
              </span>
            ))}
          </nav>
        </div>
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
        <div className="bg-gradient-to-r from-bhoomi-800 to-bhoomi-600 px-4 py-5 md:px-8 md:py-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl md:text-2xl tracking-wide text-white truncate">{title}</h1>
            {subtitle && <p className="mt-0.5 text-xs text-white/70 truncate">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      <main className="flex-1 animate-fade-in">{children}</main>
    </>
  )
}

export default AppLayout
