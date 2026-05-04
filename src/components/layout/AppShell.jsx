import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import ProtectedRoute from '@/routes/ProtectedRoute'

/**
 * Persistent app shell — Sidebar mounts once here and never unmounts
 * between page navigations. Page content is injected via <Outlet />.
 */
export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-surface-100">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
        <div
          className="flex min-h-screen flex-1 flex-col transition-all duration-300"
          style={{ marginLeft: sidebarOpen ? '240px' : '72px' }}
        >
          <Outlet />
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default AppShell
