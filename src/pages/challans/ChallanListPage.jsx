import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { listChallans, getChallanDashboard } from '@/api/challans'
import { cn } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

const STATUS_META = {
  SAVED:      { label: 'Saved',      variant: 'default', bg: 'bg-surface-100 text-surface-600' },
  DISPATCHED: { label: 'Dispatched', variant: 'amber',   bg: 'bg-amber-50 text-amber-700' },
  DELIVERED:  { label: 'Delivered',  variant: 'blue',    bg: 'bg-blue-50 text-blue-700' },
  PAID:       { label: 'Paid',       variant: 'green',   bg: 'bg-green-50 text-green-700' },
  ARCHIVED:   { label: 'Archived',   variant: 'red',     bg: 'bg-red-50 text-red-700' },
}

const fmtMoney = (v) =>
  v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

const TODAY = new Date().toISOString().slice(0, 10)
const MONTH_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

function DashboardCard({ label, amount, count, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer w-full',
        active ? 'ring-2 ring-bhoomi-500 border-bhoomi-300' : 'border-surface-200 hover:border-surface-300',
        color
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      <span className="mt-1 text-2xl font-semibold">{fmtMoney(amount)}</span>
      <span className="text-xs opacity-60 mt-0.5">{count} challans</span>
    </button>
  )
}

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />
  return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
}

export default function ChallanListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ content: [], totalElements: 0 })
  const [dashboard, setDashboard] = useState(null)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '')
  const [filterMonth, setFilterMonth] = useState(searchParams.get('month') || 'this')
  const [sortBy, setSortBy] = useState('challanDate')
  const [sortDir, setSortDir] = useState('desc')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Date range from month filter
  const getDateRange = useCallback(() => {
    const now = new Date()
    if (filterMonth === 'this') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
      }
    }
    if (filterMonth === 'last') {
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
        to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
      }
    }
    return { from: undefined, to: undefined }
  }, [filterMonth])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = getDateRange()
      const [list, dash] = await Promise.all([
        listChallans({ from, to, status: filterStatus || undefined, page, size: 20, sort: `${sortBy},${sortDir}` }),
        getChallanDashboard({ from, to }),
      ])
      setData(list)
      setDashboard(dash)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterMonth, page, sortBy, sortDir, getDateRange])

  useEffect(() => { load() }, [load])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(0)
  }

  const handleStatusFilter = (status) => {
    setFilterStatus(s => s === status ? '' : status)
    setPage(0)
  }

  const deliveryStats = dashboard?.challans?.delivery || dashboard?.delivery || {}
  const collectionStats = dashboard?.challans?.collection || dashboard?.collection || {}

  const Th = ({ col, label, className }) => (
    <th
      className={cn('px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap', className)}
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortBy={sortBy} sortDir={sortDir} />
      </span>
    </th>
  )

  return (
    <AppLayout
      title="Cash Delivery Challans"
      breadcrumbs={['Cash Sales', 'Challans']}
      actions={
        <Button onClick={() => navigate(ROUTES.CHALLANS_NEW)}>
          <Plus className="h-4 w-4" /> New Challan
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* Delivery Status Dashboard */}
        <div>
          <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wide mb-3">Delivery Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['SAVED', 'DISPATCHED', 'DELIVERED', 'PAID'].map(s => {
              const st = STATUS_META[s]
              const bucket = deliveryStats[s] || {}
              return (
                <DashboardCard
                  key={s}
                  label={st.label}
                  amount={bucket.amount}
                  count={bucket.count || 0}
                  color={st.bg}
                  active={filterStatus === s}
                  onClick={() => handleStatusFilter(s)}
                />
              )
            })}
          </div>
        </div>

        {/* Collection Status Dashboard */}
        <div>
          <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wide mb-3">Collection Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'OUTSTANDING', label: 'Outstanding', color: 'bg-red-50 text-red-700' },
              { key: 'PARTIAL', label: 'Partially Paid', color: 'bg-amber-50 text-amber-700' },
              { key: 'FULL', label: 'Fully Paid', color: 'bg-green-50 text-green-700' },
            ].map(({ key, label, color }) => {
              const bucket = collectionStats[key] || {}
              return (
                <DashboardCard
                  key={key}
                  label={label}
                  amount={bucket.amount}
                  count={bucket.count || 0}
                  color={color}
                  active={false}
                  onClick={() => {}}
                />
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardBody className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search challan number or customer..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
              />
            </div>
            <select
              value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value); setPage(0) }}
              className="px-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
            >
              <option value="this">This Month</option>
              <option value="last">Last Month</option>
              <option value="all">All</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
              className="px-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).filter(([k]) => k !== 'ARCHIVED').map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </CardBody>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <CardBody className="flex justify-center py-16">
              <Spinner className="h-8 w-8" />
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <Th col="challanNumber" label="Challan #" />
                    <Th col="challanDate" label="Date" />
                    <Th col="customer.name" label="Customer" />
                    <Th col="clusterSnapshot" label="Cluster" />
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wide">Cases</th>
                    <Th col="totalAmount" label="Total Amount" />
                    <Th col="totalCollected" label="Collected" />
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wide">Balance</th>
                    <Th col="status" label="Status" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {data.content.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-12 text-center text-sm text-surface-500">
                        No challans found.
                      </td>
                    </tr>
                  ) : (
                    data.content
                      .filter(c => !debouncedSearch || c.challanNumber?.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.customerName?.toLowerCase().includes(debouncedSearch.toLowerCase()))
                      .map(c => {
                        const st = STATUS_META[c.status] || STATUS_META.SAVED
                        const balance = (c.totalAmount || 0) - (c.totalCollected || 0)
                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-surface-50 cursor-pointer transition-colors"
                            onClick={() => navigate(ROUTES.CHALLAN_VIEW.replace(':id', c.id))}
                          >
                            <td className="px-3 py-3 font-medium text-bhoomi-700 whitespace-nowrap">{c.challanNumber}</td>
                            <td className="px-3 py-3 text-surface-600 whitespace-nowrap">{fmtDate(c.challanDate)}</td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-surface-900">{c.customerName}</div>
                              {c.clusterSnapshot && <div className="text-xs text-surface-500">{c.clusterSnapshot}</div>}
                            </td>
                            <td className="px-3 py-3 text-surface-600">{c.clusterSnapshot || '—'}</td>
                            <td className="px-3 py-3 text-surface-700">{c.totalCases ?? '—'}</td>
                            <td className="px-3 py-3 font-medium text-surface-900">{fmtMoney(c.totalAmount)}</td>
                            <td className="px-3 py-3 text-green-700 font-medium">{fmtMoney(c.totalCollected)}</td>
                            <td className={cn('px-3 py-3 font-medium', balance > 0 ? 'text-red-600' : 'text-surface-500')}>
                              {balance > 0 ? fmtMoney(balance) : '—'}
                            </td>
                            <td className="px-3 py-3">
                              <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', st.bg)}>
                                {st.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          )}
          {data.totalElements > 20 && (
            <div className="border-t border-surface-200 px-4 py-3">
              <Pagination
                page={page}
                pageSize={20}
                total={data.totalElements}
                onChange={setPage}
              />
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
