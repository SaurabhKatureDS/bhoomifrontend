import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/auth/LoginPage'
import MfaPage from '@/pages/auth/MfaPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import CustomerProfilePage from '@/pages/customers/CustomerProfilePage'
import ItemMasterPage from '@/pages/items/ItemMasterPage'
import NewRatePage from '@/pages/rates/NewRatePage'
import RateListPage from '@/pages/rates/RateListPage'
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
import { ROUTES } from '@/utils/constants'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.MFA} element={<MfaPage />} />
          <Route path={ROUTES.CHALLAN_PRINT} element={<ChallanPrintView />} />

          {/* Persistent shell — Sidebar mounts once, never remounts on navigation */}
          <Route element={<AppShell />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
            <Route path={ROUTES.CUSTOMER_PROFILE} element={<CustomerProfilePage />} />
            <Route path={ROUTES.ITEM_MASTER} element={<ItemMasterPage />} />
            <Route path={ROUTES.RATES} element={<RateListPage />} />
            <Route path={ROUTES.RATES_NEW} element={<NewRatePage />} />
            <Route path="/rates/:id/edit" element={<NewRatePage />} />
            {/* Challans */}
            <Route path={ROUTES.CHALLANS} element={<ChallanListPage />} />
            <Route path={ROUTES.CHALLANS_NEW} element={<NewChallanPage />} />
            <Route path={ROUTES.CHALLAN_EDIT} element={<NewChallanPage />} />
            <Route path={ROUTES.CHALLAN_VIEW} element={<ViewChallanPage />} />
            {/* Collections */}
            <Route path={ROUTES.COLLECTIONS} element={<CollectionListPage />} />
            <Route path={ROUTES.COLLECTION_VIEW} element={<ViewCollectionPage />} />
            {/* Unbilled */}
            <Route path={ROUTES.UNBILLED_ITEMS} element={<UnbilledItemsPage />} />
            <Route path={ROUTES.UNBILLED_TRANSACTIONS} element={<UnbilledTransactionListPage />} />
            <Route path={ROUTES.UNBILLED_TRANSACTION_NEW} element={<NewUnbilledTransactionPage />} />
            <Route path={ROUTES.UNBILLED_TRANSACTION_VIEW} element={<ViewUnbilledTransactionPage />} />
            {/* Payments */}
            <Route path={ROUTES.PAYMENTS} element={<PaymentListPage />} />
            <Route path={ROUTES.PAYMENT_VIEW} element={<ViewPaymentPage />} />
            {/* Billing Parties */}
            <Route path={ROUTES.BILLING_PARTIES} element={<BillingPartyListPage />} />
            <Route path={ROUTES.BILLING_PARTY_LEDGER} element={<BillingPartyLedgerPage />} />
            {/* Billed Items */}
            <Route path={ROUTES.BILLED_ITEMS} element={<BilledItemsPage />} />
          </Route>

          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

