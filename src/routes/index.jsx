import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { ROUTES } from '@/utils/constants'

import LoginPage from '@/pages/auth/LoginPage'
import MfaPage from '@/pages/auth/MfaPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import CustomerProfilePage from '@/pages/customers/CustomerProfilePage'
import ItemMasterPage from '@/pages/items/ItemMasterPage'
import RateListPage from '@/pages/rates/RateListPage'
import NewRatePage from '@/pages/rates/NewRatePage'
import ChallanListPage from '@/pages/challans/ChallanListPage'
import NewChallanPage from '@/pages/challans/NewChallanPage'
import ViewChallanPage from '@/pages/challans/ViewChallanPage'
import ChallanPrintView from '@/pages/challans/ChallanPrintView'
import CollectionListPage from '@/pages/collections/CollectionListPage'
import ViewCollectionPage from '@/pages/collections/ViewCollectionPage'
import UnbilledItemsPage from '@/pages/unbilled/UnbilledItemsPage'
import UnbilledTransactionListPage from '@/pages/unbilled/UnbilledTransactionListPage'
import NewUnbilledTransactionPage from '@/pages/unbilled/NewUnbilledTransactionPage'
import ViewUnbilledTransactionPage from '@/pages/unbilled/ViewUnbilledTransactionPage'
import PaymentListPage from '@/pages/payments/PaymentListPage'
import ViewPaymentPage from '@/pages/payments/ViewPaymentPage'
import BillingPartyListPage from '@/pages/billingParties/BillingPartyListPage'
import BillingPartyLedgerPage from '@/pages/billingParties/BillingPartyLedgerPage'
import BilledItemsPage from '@/pages/billed/BilledItemsPage'

const protect = (element) => <ProtectedRoute>{element}</ProtectedRoute>

const router = createBrowserRouter([
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  { path: ROUTES.MFA, element: <MfaPage /> },
  { path: ROUTES.DASHBOARD, element: protect(<DashboardPage />) },
  { path: ROUTES.CUSTOMERS, element: protect(<CustomersPage />) },
  { path: ROUTES.CUSTOMER_PROFILE, element: protect(<CustomerProfilePage />) },
  { path: ROUTES.ITEM_MASTER, element: protect(<ItemMasterPage />) },
  { path: ROUTES.RATES, element: protect(<RateListPage />) },
  { path: ROUTES.RATES_NEW, element: protect(<NewRatePage />) },
  { path: ROUTES.RATES_EDIT, element: protect(<NewRatePage />) },
  { path: ROUTES.CHALLANS, element: protect(<ChallanListPage />) },
  { path: ROUTES.CHALLANS_NEW, element: protect(<NewChallanPage />) },
  { path: ROUTES.CHALLAN_VIEW, element: protect(<ViewChallanPage />) },
  { path: ROUTES.CHALLAN_EDIT, element: protect(<NewChallanPage />) },
  { path: ROUTES.CHALLAN_PRINT, element: protect(<ChallanPrintView />) },
  { path: ROUTES.COLLECTIONS, element: protect(<CollectionListPage />) },
  { path: ROUTES.COLLECTION_VIEW, element: protect(<ViewCollectionPage />) },
  { path: ROUTES.UNBILLED_ITEMS, element: protect(<UnbilledItemsPage />) },
  { path: ROUTES.UNBILLED_TRANSACTIONS, element: protect(<UnbilledTransactionListPage />) },
  { path: ROUTES.UNBILLED_TRANSACTION_NEW, element: protect(<NewUnbilledTransactionPage />) },
  { path: ROUTES.UNBILLED_TRANSACTION_VIEW, element: protect(<ViewUnbilledTransactionPage />) },
  { path: ROUTES.PAYMENTS, element: protect(<PaymentListPage />) },
  { path: ROUTES.PAYMENT_VIEW, element: protect(<ViewPaymentPage />) },
  { path: ROUTES.BILLING_PARTIES, element: protect(<BillingPartyListPage />) },
  { path: ROUTES.BILLING_PARTY_LEDGER, element: protect(<BillingPartyLedgerPage />) },
  { path: ROUTES.BILLED_ITEMS, element: protect(<BilledItemsPage />) },
  { path: '*', element: <Navigate to={ROUTES.LOGIN} replace /> },
])

export default router
