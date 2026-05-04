import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { ROUTES } from '@/utils/constants'

import LoginPage from '@/pages/auth/LoginPage'
import MfaPage from '@/pages/auth/MfaPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import ItemMasterPage from '@/pages/items/ItemMasterPage'

const router = createBrowserRouter([
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  { path: ROUTES.MFA, element: <MfaPage /> },
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.CUSTOMERS,
    element: (
      <ProtectedRoute>
        <CustomersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.ITEM_MASTER,
    element: (
      <ProtectedRoute>
        <ItemMasterPage />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Navigate to={ROUTES.LOGIN} replace /> },
])

export default router
