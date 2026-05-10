/* ═══════════════════════════════════════════════════════════
   App Constants — No hardcoded strings in components
   ═══════════════════════════════════════════════════════════ */

/** Brand */
export const APP_NAME = 'Bhoomi Enterprises'
export const APP_DIVISION = 'Samadhan Division Portal'
export const APP_TAGLINE = 'Wholesale & Trading Operations'
export const APP_CITIES = 'Mumbai · Hyderabad · Chennai'

/** Route paths */
export const ROUTES = {
  LOGIN: '/login',
  MFA: '/mfa',
  DASHBOARD: '/dashboard',
  CUSTOMERS: '/customers',
  CUSTOMER_PROFILE: '/customers/cash/:id',
  ITEM_MASTER: '/item-master',
  RATES: '/rates',
  RATES_NEW: '/rates/new',
  RATES_EDIT: '/rates/:id/edit',
  // Challans
  CHALLANS: '/challans',
  CHALLANS_NEW: '/challans/new',
  CHALLAN_VIEW: '/challans/:id',
  CHALLAN_EDIT: '/challans/:id/edit',
  CHALLAN_PRINT: '/challans/:id/print',
  // Collections
  COLLECTIONS: '/collections',
  COLLECTION_VIEW: '/collections/:id',
  // Unbilled
  UNBILLED_ITEMS: '/unbilled-items',
  UNBILLED_TRANSACTIONS: '/unbilled-transactions',
  UNBILLED_TRANSACTION_NEW: '/unbilled-transactions/new',
  UNBILLED_TRANSACTION_VIEW: '/unbilled-transactions/:id',
  // Payments
  PAYMENTS: '/payments',
  PAYMENT_VIEW: '/payments/:id',
  // Billing Parties
  BILLING_PARTIES: '/billing-parties',
  BILLING_PARTY_LEDGER: '/billing-parties/:id/ledger',
  // Billed Items
  BILLED_ITEMS: '/billed-items',
}

/** Navigation items for the dashboard sidebar */
export const DASHBOARD_NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'LayoutDashboard', active: true },
  { label: 'Challans', path: '#', icon: 'FileText' },
  { label: 'Dispatch', path: '#', icon: 'Truck' },
  { label: 'Customers', path: '#', icon: 'Users' },
  { label: 'Items', path: '#', icon: 'Package' },
  { label: 'Collections', path: '#', icon: 'Wallet' },
  { label: 'Payments', path: '#', icon: 'Receipt' },
]

/** OTP / MFA */
export const OTP_LENGTH = 6
