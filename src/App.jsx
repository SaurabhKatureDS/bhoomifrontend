import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/auth/LoginPage'
import MfaPage from '@/pages/auth/MfaPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import ItemMasterPage from '@/pages/items/ItemMasterPage'
import NewRatePage from '@/pages/rates/NewRatePage'
import RateListPage from '@/pages/rates/RateListPage'
import { ROUTES } from '@/utils/constants'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.MFA} element={<MfaPage />} />

          {/* Persistent shell — Sidebar mounts once, never remounts on navigation */}
          <Route element={<AppShell />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
            <Route path={ROUTES.ITEM_MASTER} element={<ItemMasterPage />} />
            <Route path={ROUTES.RATES} element={<RateListPage />} />
            <Route path={ROUTES.RATES_NEW} element={<NewRatePage />} />
            <Route path="/rates/:id/edit" element={<NewRatePage />} />
          </Route>

          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
