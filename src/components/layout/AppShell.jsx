import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import ProtectedRoute from '@/routes/ProtectedRoute'
import { SidebarContext } from '@/context/SidebarContext'

/**
 * Persistent app shell — Sidebar mounts once here and never unmounts
 * between page navigations. Page content is injected via <Outlet />.
 */
export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const desktopMargin = sidebarOpen ? '240px' : '72px'

  return (
    <ProtectedRoute>
      <SidebarContext.Provider value={{ onMenuToggle: () => setMobileOpen((v) => !v) }}>
        <div className="flex h-screen overflow-hidden bg-surface-100">
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />

          {/* Mobile backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-30 bg-surface-900/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <div
            className="flex flex-1 flex-col overflow-y-auto transition-all duration-300"
            style={{ marginLeft: isMobile ? 0 : desktopMargin }}
          >
            <Outlet />
          </div>
        </div>
      </SidebarContext.Provider>
    </ProtectedRoute>
  )
}

export default AppShell
