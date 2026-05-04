import { NavLink, useNavigate } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import {
  LayoutDashboard,
  FilePlus,
  ListChecks,
  Banknote,
  ClipboardList,
  Boxes,
  Hourglass,
  Wallet,
  CheckCircle2,
  Plus,
  List,
  CalendarDays,
  Megaphone,
  Users,
  Package,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/helpers'
import { APP_NAME, APP_DIVISION } from '@/utils/constants'

/**
 * Sidebar navigation, mirrors the Bhoomi Samadhan layout shown in mockups.
 * Sections: Challans · Inventory · Finance · Rates · Config.
 */
const SECTIONS = [
  {
    title: 'Challans',
    items: [
      { label: 'New Challan', icon: FilePlus, path: '/challans/new' },
      { label: 'Challan List', icon: ListChecks, path: '/challans' },
      { label: 'Collections', icon: Banknote, path: '/collections' },
      { label: 'Sales Orders', icon: ClipboardList, path: '/sales-orders' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Stock Master', icon: Boxes, path: '/stock' },
      { label: 'Unbilled Items', icon: Hourglass, path: '/unbilled' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Commission Ledger', icon: Wallet, path: '/commission' },
      { label: 'Reconciliation', icon: CheckCircle2, path: '/reconciliation' },
    ],
  },
  {
    title: 'Rates',
    items: [
      { label: 'New Rate', icon: Plus, path: '/rates/new' },
      { label: 'Rate List', icon: List, path: '/rates' },
      { label: 'Price Lists', icon: CalendarDays, path: '/price-lists' },
      { label: 'Broadcast', icon: Megaphone, path: '/broadcast' },
    ],
  },
  {
    title: 'Config',
    items: [
      { label: 'Customers', icon: Users, path: '/customers' },
      { label: 'Item Master', icon: Package, path: '/item-master' },
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Settings', icon: Settings, path: '/settings' },
    ],
  },
]

export function Sidebar({ isOpen = true, onToggle, mobileOpen = false, onMobileClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const navRef = useRef(null)

  // Restore scroll position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('sidebar-scroll')
    if (saved && navRef.current) navRef.current.scrollTop = Number(saved)
  }, [])

  // Save scroll position on unmount
  useEffect(() => {
    const el = navRef.current
    return () => {
      if (el) sessionStorage.setItem('sidebar-scroll', el.scrollTop)
    }
  }, [])

  const handleLogout = async () => {
    await logout?.()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 flex-col bg-gradient-to-b from-bhoomi-800 to-bhoomi-600',
        'transition-all duration-300 z-40',
        // Width: always full on mobile drawer, toggleable on desktop
        mobileOpen ? 'w-60' : isOpen ? 'w-60' : 'w-[72px]',
        // Visibility: show on mobile only when mobileOpen, always show on desktop
        mobileOpen ? 'flex' : 'hidden md:flex',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-white/10 transition-all duration-300',
          isOpen || mobileOpen ? 'px-5 gap-3' : 'flex-col justify-center gap-1'
        )}
      >
        {(isOpen || mobileOpen) && (
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl tracking-wider text-white">
              <span className="font-bold">Bhoomi</span>
              <span className="font-light text-white/70">.</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-white/60">
              {APP_DIVISION.replace(' Portal', '')}
            </p>
          </div>
        )}
        {!isOpen && !mobileOpen && (
          <div className="font-display text-lg font-bold tracking-wider text-white select-none">
            B
          </div>
        )}
        {/* Mobile: close button */}
        {mobileOpen && (
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors shrink-0 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {/* Desktop: collapse/expand toggle */}
        {!mobileOpen && (
          <button
            type="button"
            onClick={onToggle}
            className="hidden rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors shrink-0 md:block"
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav ref={navRef} className="flex-1 overflow-y-auto px-2 py-4 space-y-5 overflow-x-hidden">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            {(isOpen || mobileOpen) && (
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    onClick={() => mobileOpen && onMobileClose?.()}
                    className={({ isActive }) =>
                      cn(
                        'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/75 hover:bg-white/10 hover:text-white',
                        isOpen || mobileOpen ? 'gap-3' : 'justify-center px-2'
                      )
                    }
                    title={!isOpen && !mobileOpen ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {(isOpen || mobileOpen) && item.label}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          'm-2 flex cursor-pointer items-center rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white',
          isOpen || mobileOpen ? 'gap-2' : 'justify-center px-2'
        )}
        title={!isOpen && !mobileOpen ? 'Sign Out' : APP_NAME}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {(isOpen || mobileOpen) && 'Sign Out'}
      </button>
    </aside>
  )
}

export default Sidebar
