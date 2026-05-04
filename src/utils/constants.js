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
  ITEM_MASTER: '/item-master',
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
