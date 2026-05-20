import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  User,
  FileText,
  Layers,
  Wallet,
  Search,
  Pencil,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Phone,
  MapPin,
  Building,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  getCashCustomerProfile,
  getCashCustomerLedger,
  getCashCustomerChallans,
  getCashCustomerRates,
  updateCashCustomer,
} from '@/api/customers'
import { listClusters } from '@/api/clusters'
import { formatPhone } from '@/utils/helpers'
import AddCashCustomerModal from './AddCashCustomerModal'

const fmtMoney = (v) =>
  v == null ? '—' : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(v))}`

const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

function downloadLedgerCSV(data) {
  const headers = ['Date', 'Category', 'Transaction', 'Person', 'DC#', 'Description', 'Dr Amount', 'Cr Amount']
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    `Customer: ${data.customerName} | City: ${data.city || ''} | Cluster: ${data.clusterName || ''} | Phone: ${data.phone || ''}`,
    '',
    headers.join(','),
    ...(data.entries || []).map((e) =>
      [
        fmtDate(e.date),
        e.category,
        e.transaction,
        e.person || '',
        e.challanNumber || '',
        e.description || '',
        e.side === 'DR' ? Number(e.amount) : '',
        e.side === 'CR' ? Number(e.amount) : '',
      ]
        .map(escape)
        .join(',')
    ),
    '',
    escape(`Total Sales`) + `,,,,,,,${Number(data.totalSales || 0)}`,
    escape(`Total Collected`) + `,,,,,,,${Number(data.totalCollected || 0)}`,
    escape(`Outstanding`) + `,,,,,,,${Number(data.outstanding || 0)}`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ledger-${data.customerName?.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function LabelBadge({ label }) {
  if (!label) return null
  if (label === 'Receivable' || label === 'Receivables') return <Badge variant="amber">{label}</Badge>
  if (label === 'Excess cash paid' || label === 'Advance received') return <Badge variant="green">{label}</Badge>
  return <Badge variant="default">{label}</Badge>
}

export default function CustomerProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [challans, setChallans] = useState([])
  const [rates, setRates] = useState([])
  const [clusters, setClusters] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')

  // Modal edit states
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Rate list filters / sorts
  const [rateSearch, setRateSearch] = useState('')
  const [rateValidityFilter, setRateValidityFilter] = useState('all') // 'all' | 'open' | 'expired'
  const [rateStatusFilter, setRateStatusFilter] = useState('all') // 'all' | 'saved' | 'approved' | 'closed' | 'expired'
  const [rateSort, setRateSort] = useState({ by: 'date', dir: 'desc' })

  // Challan search / sorts
  const [challanSearch, setChallanSearch] = useState('')
  const [challanSort, setChallanSort] = useState({ by: 'date', dir: 'desc' })

  const loadAllData = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getCashCustomerProfile(id),
      getCashCustomerLedger(id),
      getCashCustomerChallans(id),
      getCashCustomerRates(id),
      listClusters().catch(() => []),
    ])
      .then(([profData, ledgData, challData, rateData, clustData]) => {
        setProfile(profData)
        setLedger(ledgData)
        setChallans(challData || [])
        setRates(rateData || [])
        setClusters(clustData || [])
      })
      .catch((e) => {
        console.error(e)
        setError(e.message || 'Failed to load customer profile details')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const handleEditSubmit = async (payload) => {
    setSaving(true)
    try {
      await updateCashCustomer(id, payload)
      setModalOpen(false)
      loadAllData()
    } catch (err) {
      alert(err.message || 'Failed to update customer details')
    } finally {
      setSaving(false)
    }
  }

  // Rate List local search/sort/filter
  const filteredRates = (rates || [])
    .filter((r) => {
      // Search quoteNumber, poNumber, status
      const qStr = (r.quoteNumber || '').toLowerCase()
      const poStr = (r.poNumber || '').toLowerCase()
      const statusStr = (r.status || '').toLowerCase()
      const searchLower = rateSearch.toLowerCase()
      const matchesSearch =
        qStr.includes(searchLower) || poStr.includes(searchLower) || statusStr.includes(searchLower)

      // Validity filter (Open vs Expired)
      const today = new Date().setHours(0, 0, 0, 0)
      const validDate = r.validTill ? new Date(r.validTill).getTime() : 0
      const isOpen = validDate >= today
      const matchesValidity =
        rateValidityFilter === 'all' ||
        (rateValidityFilter === 'open' && isOpen) ||
        (rateValidityFilter === 'expired' && !isOpen)

      // Status filter
      const matchesStatus =
        rateStatusFilter === 'all' || statusStr === rateStatusFilter.toLowerCase()

      return matchesSearch && matchesValidity && matchesStatus
    })
    .sort((a, b) => {
      let valA, valB
      if (rateSort.by === 'quoteNumber') {
        valA = a.quoteNumber || ''
        valB = b.quoteNumber || ''
      } else if (rateSort.by === 'date') {
        valA = a.rateDate ? new Date(a.rateDate).getTime() : 0
        valB = b.rateDate ? new Date(b.rateDate).getTime() : 0
      } else if (rateSort.by === 'po') {
        valA = a.poNumber || ''
        valB = b.poNumber || ''
      } else if (rateSort.by === 'validTill') {
        valA = a.validTill ? new Date(a.validTill).getTime() : 0
        valB = b.validTill ? new Date(b.validTill).getTime() : 0
      } else if (rateSort.by === 'cases') {
        valA = a.totalCases || 0
        valB = b.totalCases || 0
      } else if (rateSort.by === 'amount') {
        valA = Number(a.totalAmount || 0)
        valB = Number(b.totalAmount || 0)
      } else if (rateSort.by === 'status') {
        valA = a.status || ''
        valB = b.status || ''
      }

      if (valA < valB) return rateSort.dir === 'asc' ? -1 : 1
      if (valA > valB) return rateSort.dir === 'asc' ? 1 : -1
      return 0
    })

  // Challans local search/sort/filter
  const filteredChallans = (challans || [])
    .filter((c) => {
      const qStr = (c.challanNumber || '').toLowerCase()
      const statusStr = (c.status || '').toLowerCase()
      const searchLower = challanSearch.toLowerCase()
      return qStr.includes(searchLower) || statusStr.includes(searchLower)
    })
    .sort((a, b) => {
      let valA, valB
      if (challanSort.by === 'challanNumber') {
        valA = a.challanNumber || ''
        valB = b.challanNumber || ''
      } else if (challanSort.by === 'date') {
        valA = a.challanDate ? new Date(a.challanDate).getTime() : 0
        valB = b.challanDate ? new Date(b.challanDate).getTime() : 0
      } else if (challanSort.by === 'cases') {
        valA = a.totalCases || 0
        valB = b.totalCases || 0
      } else if (challanSort.by === 'amount') {
        valA = Number(a.totalAmount || 0)
        valB = Number(b.totalAmount || 0)
      } else if (challanSort.by === 'collected') {
        valA = Number(a.totalCollected || 0)
        valB = Number(b.totalCollected || 0)
      } else if (challanSort.by === 'status') {
        valA = a.status || ''
        valB = b.status || ''
      }

      if (valA < valB) return challanSort.dir === 'asc' ? -1 : 1
      if (valA > valB) return challanSort.dir === 'asc' ? 1 : -1
      return 0
    })

  const toggleRateSort = (field) => {
    setRateSort((prev) => ({
      by: field,
      dir: prev.by === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleChallanSort = (field) => {
    setChallanSort((prev) => ({
      by: field,
      dir: prev.by === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  const outstanding = ledger ? Number(ledger.outstanding || 0) : 0
  const customerObj = profile?.customer || {}
  const dashObj = profile?.dashboard || {}

  const TABS = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'rates', label: 'Rate List', icon: Layers },
    { id: 'ledger', label: 'Ledger', icon: Wallet },
  ]

  return (
    <AppLayout
      title={customerObj.name || 'Customer Profile'}
      subtitle="Bhoomi Enterprises · Customer Ledger"
      breadcrumbs={['Bhoomi Enterprises', 'Customers', customerObj.name || '...']}
    >
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* Navigation & Toolbar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="flex items-center gap-1.5 text-sm text-surface-600 hover:text-surface-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModalOpen(true)} className="gap-1.5 text-xs font-semibold">
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </Button>
            {activeTab === 'ledger' && ledger && (
              <Button variant="outline" onClick={() => downloadLedgerCSV(ledger)} className="gap-1.5 text-xs font-semibold">
                <Download className="h-3.5 w-3.5" /> Download Ledger CSV
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && profile && (
          <>
            {/* Top Customer Header Card */}
            <Card className="px-6 py-5 bg-gradient-to-r from-white to-surface-50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-surface-900 leading-tight">{customerObj.name}</h2>
                    {customerObj.clusterName && (
                      <Badge variant="blue" className="px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                        {customerObj.clusterName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-surface-600">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-surface-400" />
                      {customerObj.phone ? formatPhone(customerObj.phone) : '—'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-surface-400" />
                      {customerObj.city || 'Mumbai'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start sm:items-end flex-col bg-surface-100/55 rounded-xl border border-surface-200 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-surface-500">Outstanding O/S</div>
                  <div className={`text-2xl font-black tabular-nums mt-0.5 ${outstanding > 0 ? 'text-red-600' : outstanding < 0 ? 'text-green-600' : 'text-surface-600'}`}>
                    {outstanding < 0 ? `(${fmtMoney(Math.abs(outstanding))})` : fmtMoney(outstanding)}
                  </div>
                  {ledger?.label && (
                    <div className="mt-1">
                      <LabelBadge label={ledger.label} />
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Premium Tab Bar Navigation */}
            <div className="border-b border-surface-200">
              <div className="flex gap-1 md:gap-2 overflow-x-auto">
                {TABS.map((t) => {
                  const Icon = t.icon
                  const active = activeTab === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                        active
                          ? 'border-bhoomi-600 text-bhoomi-600 font-bold'
                          : 'border-transparent text-surface-500 hover:text-surface-800'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-bhoomi-600' : 'text-surface-400'}`} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* TAB CONTENT PANELS */}
            <div className="animate-fade-in">
              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <Card className="p-6 space-y-6">
                  <h3 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3 uppercase tracking-wider">
                    Customer Master Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-surface-400">Full Name / shop name</span>
                        <span className="text-base font-semibold text-surface-900 mt-1 block">{customerObj.name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-surface-400">Primary Phone Number</span>
                        <span className="text-base font-semibold text-surface-900 mt-1 block flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-surface-400" />
                          {customerObj.phone ? formatPhone(customerObj.phone) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-surface-400">City Location</span>
                        <span className="text-base font-semibold text-surface-900 mt-1 block flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-surface-400" />
                          {customerObj.city || 'Mumbai'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-surface-400">Assigned Cluster</span>
                        <span className="text-base font-semibold text-surface-900 mt-1 block flex items-center gap-1.5">
                          <Building className="h-4 w-4 text-surface-400" />
                          {customerObj.clusterName ? (
                            <Badge variant="blue" className="text-xs uppercase font-semibold">
                              {customerObj.clusterName}
                            </Badge>
                          ) : (
                            'Unassigned'
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-surface-400">Physical Address</span>
                        <p className="text-sm font-medium text-surface-700 mt-1 block bg-surface-50 border border-surface-200/50 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                          {customerObj.address || 'No physical address specified.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-surface-100 pt-5 flex justify-end">
                    <Button variant="outline" onClick={() => setModalOpen(true)} className="gap-1.5 text-xs font-bold uppercase">
                      <Pencil className="h-4 w-4" /> Edit Account Info
                    </Button>
                  </div>
                </Card>
              )}

              {/* TRANSACTIONS TAB */}
              {activeTab === 'transactions' && (
                <div className="space-y-6">
                  {/* Top Dashboard Financial Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-4 bg-white/75 flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Last Challan Date</div>
                        <div className="text-lg font-extrabold text-surface-800 mt-0.5">
                          {dashObj.lastChallanDate ? fmtDate(dashObj.lastChallanDate) : 'No transactions'}
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-white/75 flex items-center gap-4">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Total MTD Challans</div>
                        <div className="text-lg font-extrabold text-surface-800 mt-0.5">
                          {dashObj.mtdChallanCount ?? 0} Challans
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-white/75 flex items-center gap-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Outstanding Receivable</div>
                        <div className="text-lg font-extrabold text-surface-800 mt-0.5 text-red-600">
                          {fmtMoney(dashObj.outstandingReceivable ?? 0)}
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Challans List */}
                  <Card className="overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-surface-50/50">
                      <h3 className="text-sm font-extrabold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="h-4.5 w-4.5 text-surface-400" />
                        Challan Operations History ({filteredChallans.length})
                      </h3>
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                        <input
                          type="text"
                          placeholder="Search Challan # or status..."
                          value={challanSearch}
                          onChange={(e) => setChallanSearch(e.target.value)}
                          className="w-full rounded-lg border border-surface-300 bg-white py-1.5 pl-9 pr-3 text-xs text-surface-850 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-surface-200">
                        <thead className="bg-surface-50">
                          <tr>
                            {[
                              { label: 'Challan #', key: 'challanNumber' },
                              { label: 'Date', key: 'date' },
                              { label: 'Status', key: 'status' },
                              { label: 'Cases', key: 'cases' },
                              { label: 'Amount (₹)', key: 'amount' },
                              { label: 'Collected (₹)', key: 'collected' },
                            ].map((h) => (
                              <th
                                key={h.key}
                                onClick={() => toggleChallanSort(h.key)}
                                className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-surface-500 select-none cursor-pointer hover:bg-surface-100 transition-colors"
                              >
                                <div className="flex items-center gap-1">
                                  {h.label}
                                  {challanSort.by === h.key ? (
                                    challanSort.dir === 'asc' ? <ArrowUp className="h-3 w-3 text-bhoomi-600" /> : <ArrowDown className="h-3 w-3 text-bhoomi-600" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 text-surface-400" />
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="px-5 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100 bg-white">
                          {filteredChallans.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-12 text-center text-sm text-surface-500">
                                No matching delivery challans found.
                              </td>
                            </tr>
                          ) : (
                            filteredChallans.map((c) => (
                              <tr
                                key={c.id}
                                className="hover:bg-surface-50/50 cursor-pointer transition-colors"
                                onClick={() => navigate(`/challans/${c.id}`)}
                              >
                                <td className="px-5 py-3.5 text-sm font-bold text-bhoomi-600 hover:underline">{c.challanNumber}</td>
                                <td className="px-5 py-3.5 text-sm text-surface-600 whitespace-nowrap">{fmtDate(c.challanDate)}</td>
                                <td className="px-5 py-3.5 text-sm">
                                  <Badge
                                    variant={
                                      c.status === 'PAID'
                                        ? 'green'
                                        : c.status === 'DELIVERED'
                                        ? 'blue'
                                        : c.status === 'DISPATCHED'
                                        ? 'amber'
                                        : c.status === 'SAVED'
                                        ? 'default'
                                        : 'red'
                                    }
                                    className="uppercase font-bold tracking-wide text-[10px]"
                                  >
                                    {c.status}
                                  </Badge>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-surface-700 tabular-nums">{c.totalCases ?? '—'}</td>
                                <td className="px-5 py-3.5 text-sm font-semibold text-surface-900 tabular-nums">{fmtMoney(c.totalAmount)}</td>
                                <td className="px-5 py-3.5 text-sm text-green-600 font-medium tabular-nums">
                                  {c.totalCollected != null && c.totalCollected > 0 ? fmtMoney(c.totalCollected) : '—'}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <ChevronRight className="h-4 w-4 text-surface-300 inline" />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* RATE LIST TAB */}
              {activeTab === 'rates' && (
                <Card className="overflow-hidden space-y-4">
                  {/* Rates Controls */}
                  <div className="px-5 py-4 border-b border-surface-200 bg-surface-50/50 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-sm font-extrabold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="h-4.5 w-4.5 text-surface-400" />
                        Approved Pricing Rate Lists ({filteredRates.length})
                      </h3>
                      <Button onClick={() => navigate('/rates/new', { state: { defaultCustomerId: id } })} className="gap-1 text-xs py-1.5 font-bold">
                        + New Rate Card
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                        <input
                          type="text"
                          placeholder="Search Quote #, PO, status..."
                          value={rateSearch}
                          onChange={(e) => setRateSearch(e.target.value)}
                          className="w-full rounded-lg border border-surface-300 bg-white py-1.5 pl-9 pr-3 text-xs text-surface-850 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20"
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={rateValidityFilter}
                          onChange={(e) => setRateValidityFilter(e.target.value)}
                          className="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs text-surface-700 font-semibold focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20"
                        >
                          <option value="all">All Validity Statuses</option>
                          <option value="open">Open (Active)</option>
                          <option value="expired">Expired</option>
                        </select>
                        <select
                          value={rateStatusFilter}
                          onChange={(e) => setRateStatusFilter(e.target.value)}
                          className="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs text-surface-700 font-semibold focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20"
                        >
                          <option value="all">All Rate Statuses</option>
                          <option value="saved">Saved Only</option>
                          <option value="approved">Approved</option>
                          <option value="expired">Expired Systematically</option>
                          <option value="closed">Closed / Deactivated</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Rates Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-surface-200">
                      <thead className="bg-surface-50">
                        <tr>
                          {[
                            { label: 'Quote Number', key: 'quoteNumber' },
                            { label: 'Date', key: 'date' },
                            { label: 'PO Number', key: 'po' },
                            { label: 'Valid Till', key: 'validTill' },
                            { label: 'Cases', key: 'cases' },
                            { label: 'Amount (₹)', key: 'amount' },
                            { label: 'Status', key: 'status' },
                          ].map((h) => (
                            <th
                              key={h.key}
                              onClick={() => toggleRateSort(h.key)}
                              className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-surface-500 select-none cursor-pointer hover:bg-surface-100 transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                {h.label}
                                {rateSort.by === h.key ? (
                                  rateSort.dir === 'asc' ? <ArrowUp className="h-3 w-3 text-bhoomi-600" /> : <ArrowDown className="h-3 w-3 text-bhoomi-600" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 text-surface-400" />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 bg-white">
                        {filteredRates.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-sm text-surface-500">
                              No pricing rate quote lists found.
                            </td>
                          </tr>
                        ) : (
                          filteredRates.map((r) => {
                            const today = new Date().setHours(0, 0, 0, 0)
                            const isRateOpen = r.validTill ? new Date(r.validTill).getTime() >= today : false
                            return (
                              <tr
                                key={r.id}
                                className="hover:bg-surface-50/50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/rates`)} // Navigate to rates list page
                              >
                                <td className="px-5 py-3.5 text-sm font-bold text-surface-900">{r.quoteNumber}</td>
                                <td className="px-5 py-3.5 text-sm text-surface-600 whitespace-nowrap">{fmtDate(r.rateDate)}</td>
                                <td className="px-5 py-3.5 text-sm text-surface-700 font-mono">{r.poNumber || '—'}</td>
                                <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-surface-700 font-medium">{fmtDate(r.validTill)}</span>
                                    <div className="w-fit">
                                      {isRateOpen ? (
                                        <Badge variant="green" className="py-0 px-1 text-[9px] font-bold uppercase tracking-wider">Open</Badge>
                                      ) : (
                                        <Badge variant="red" className="py-0 px-1 text-[9px] font-bold uppercase tracking-wider">Expired</Badge>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-surface-700 tabular-nums">{r.totalCases ?? '—'}</td>
                                <td className="px-5 py-3.5 text-sm font-semibold text-surface-900 tabular-nums">{fmtMoney(r.totalAmount)}</td>
                                <td className="px-5 py-3.5 text-sm">
                                  <Badge
                                    variant={
                                      r.status === 'APPROVED'
                                        ? 'green'
                                        : r.status === 'SAVED'
                                        ? 'default'
                                        : r.status === 'EXPIRED'
                                        ? 'red'
                                        : 'amber'
                                    }
                                    className="uppercase font-bold tracking-wide text-[9px]"
                                  >
                                    {r.status}
                                  </Badge>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* LEDGER TAB */}
              {activeTab === 'ledger' && ledger && (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-surface-200">
                      <thead className="bg-surface-50">
                        <tr>
                          {['Date', 'Category', 'Transaction', 'Person', 'DC#', 'Description', 'Dr Amount (₹)', 'Cr Amount (₹)'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 bg-white">
                        {(ledger.entries || []).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-10 text-center text-sm text-surface-500">
                              No ledger entries found.
                            </td>
                          </tr>
                        ) : (
                          ledger.entries.map((e, i) => (
                            <tr key={i} className="hover:bg-surface-50/50">
                              <td className="px-4 py-2.5 text-sm text-surface-600 whitespace-nowrap">{fmtDate(e.date)}</td>
                              <td className="px-4 py-2.5 text-sm text-surface-700">{e.category}</td>
                              <td className="px-4 py-2.5 text-sm text-surface-800">{e.transaction}</td>
                              <td className="px-4 py-2.5 text-sm text-surface-600">{e.person || '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-surface-600">{e.challanNumber || '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-surface-500 italic">{e.description || '—'}</td>
                              <td className="px-4 py-2.5 text-sm tabular-nums text-right text-red-600 font-medium whitespace-nowrap">
                                {e.side === 'DR' ? fmtMoney(e.amount) : ''}
                              </td>
                              <td className="px-4 py-2.5 text-sm tabular-nums text-right text-green-600 font-medium whitespace-nowrap">
                                {e.side === 'CR' ? fmtMoney(e.amount) : ''}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {/* Summary footer */}
                      <tfoot className="bg-surface-50 border-t-2 border-surface-200">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-surface-700 text-right">Total Sales</td>
                          <td className="px-4 py-3 text-sm font-bold tabular-nums text-right text-red-600 whitespace-nowrap">{fmtMoney(ledger.totalSales)}</td>
                          <td />
                        </tr>
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-surface-700 text-right">Total Collected</td>
                          <td />
                          <td className="px-4 py-3 text-sm font-bold tabular-nums text-right text-green-600 whitespace-nowrap">{fmtMoney(ledger.totalCollected)}</td>
                        </tr>
                        <tr className="border-t border-surface-200">
                          <td colSpan={6} className="px-4 py-3 text-sm font-bold text-surface-800 text-right">
                            Closing Balance
                            {ledger.label && (
                              <span className="ml-2 align-middle">
                                <LabelBadge label={ledger.label} />
                              </span>
                            )}
                          </td>
                          <td
                            colSpan={2}
                            className={`px-4 py-3 text-base font-bold tabular-nums text-right whitespace-nowrap ${
                              outstanding > 0 ? 'text-red-600' : outstanding < 0 ? 'text-green-600' : 'text-surface-500'
                            }`}
                          >
                            {outstanding < 0 ? `(${fmtMoney(Math.abs(outstanding))})` : fmtMoney(outstanding)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      <AddCashCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleEditSubmit}
        clusters={clusters}
        customer={customerObj}
        saving={saving}
      />
    </AppLayout>
  )
}
