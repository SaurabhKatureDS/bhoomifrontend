import re

with open('src/pages/challans/ChallanListPage.jsx', 'r') as f:
    content = f.read()

# I will write out the exact full file content for ChallanListPage.jsx

new_content = """import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { listChallans, getChallanDashboard } from '@/api/challans'
import { cn } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const firstOfMonth = (y, m) =>
  `${y}-${String(m + 1).padStart(2, '0')}-01`

const lastOfMonth = (y, m) => {
  const d = new Date(y, m + 1, 0)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_META = {
  SAVED:      { label: 'Saved',      variant: 'default', bg: 'bg-surface-100 text-surface-600' },
  DISPATCHED: { label: 'Dispatched', variant: 'amber',   bg: 'bg-amber-50 text-amber-700' },
  DELIVERED:  { label: 'Delivered',  variant: 'blue',    bg: 'bg-blue-50 text-blue-700' },
  ARCHIVED:   { label: 'Archived',   variant: 'red',     bg: 'bg-red-50 text-red-700' },
}

const fmtMoney = (v) =>
  v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

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
  const now = new Date()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ content: [], totalElements: 0 })
  const [dashboard, setDashboard] = useState(null)
  const [page, setPage] = useState(0)
  
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  // Month selector — null = All
  const [selYear, setSelYear] = useState(null)
  const [selMonth, setSelMonth] = useState(null) // 0-indexed, null = All
  
  const [datePeriod, setDatePeriod] = useState('')
  
  // Dashboard Filters: { type: 'delivery' | 'collection' | null, value: string | null }
  const [dashboardFilter, setDashboardFilter] = useState({ type: null, value: null })

  const [sortBy, setSortBy] = useState('challanDate')
  const [sortDir, setSortDir] = useState('desc')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])
  
  // Reset page on filter changes
  useEffect(() => { setPage(0) }, [selYear, selMonth, datePeriod, dashboardFilter, debouncedSearch, sortBy, sortDir])

  const getDateRange = useCallback(() => {
    if (datePeriod) {
      const now = new Date()
      if (datePeriod === 'today') {
        const d = now.toISOString().slice(0, 10)
        return { from: d, to: d }
      }
      if (datePeriod === 'yesterday') {
        const d = new Date(now)
        d.setDate(d.getDate() - 1)
        const yd = d.toISOString().slice(0, 10)
        return { from: yd, to: yd }
      }
      if (datePeriod === 'this_week') {
        const start = new Date(now)
        start.setDate(now.getDate() - now.getDay())
        const end = new Date(now)
        end.setDate(start.getDate() + 6)
        return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
      }
      if (datePeriod === 'this_month') {
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
        }
      }
    } else if (selMonth !== null && selYear !== null) {
      return {
        from: firstOfMonth(selYear, selMonth),
        to: lastOfMonth(selYear, selMonth)
      }
    }
    return { from: undefined, to: undefined }
  }, [datePeriod, selMonth, selYear])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = getDateRange()
      const [list, dash] = await Promise.all([
        listChallans({ 
          from, 
          to, 
          status: dashboardFilter.type === 'delivery' ? dashboardFilter.value : undefined, 
          collectionStatus: dashboardFilter.type === 'collection' ? dashboardFilter.value : undefined,
          q: debouncedSearch || undefined,
          page, 
          size: 20, 
          sort: `${sortBy},${sortDir}` 
        }),
        getChallanDashboard({ from, to }),
      ])
      setData(list)
      setDashboard(dash)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [dashboardFilter, debouncedSearch, page, sortBy, sortDir, getDateRange])

  useEffect(() => { load() }, [load])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(0)
  }

  const handleDashboardFilter = (type, value) => {
    if (dashboardFilter.type === type && dashboardFilter.value === value) {
      setDashboardFilter({ type: null, value: null })
    } else {
      setDashboardFilter({ type, value })
    }
  }

  const prevMonth = () => {
    if (selMonth === null) { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()); return }
    if (selMonth === 0) { setSelYear((y) => y - 1); setSelMonth(11) }
    else setSelMonth((m) => m - 1)
    setDatePeriod('')
  }

  const nextMonth = () => {
    if (selMonth === null) { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()); return }
    if (selMonth === 11) { setSelYear((y) => y + 1); setSelMonth(0) }
    else setSelMonth((m) => m + 1)
    setDatePeriod('')
  }

  const deliveryStats = dashboard?.challans?.delivery || dashboard?.delivery || {}
  const collectionStats = dashboard?.challans?.collection || dashboard?.collection || {}
  
  const totalDeliveryCount = (deliveryStats.SAVED?.count || 0) + (deliveryStats.DISPATCHED?.count || 0) + (deliveryStats.DELIVERED?.count || 0)
  const totalDeliveryAmount = (deliveryStats.SAVED?.amount || 0) + (deliveryStats.DISPATCHED?.amount || 0) + (deliveryStats.DELIVERED?.amount || 0)

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
            <DashboardCard
              label="TOTAL"
              amount={totalDeliveryAmount}
              count={totalDeliveryCount}
              color="bg-surface-50 text-surface-700"
              active={dashboardFilter.type === null}
              onClick={() => setDashboardFilter({ type: null, value: null })}
            />
            {['SAVED', 'DISPATCHED', 'DELIVERED'].map(s => {
              const st = STATUS_META[s]
              const bucket = deliveryStats[s] || {}
              return (
                <DashboardCard
                  key={s}
                  label={st.label}
                  amount={bucket.amount}
                  count={bucket.count || 0}
                  color={st.bg}
                  active={dashboardFilter.type === 'delivery' && dashboardFilter.value === s}
                  onClick={() => handleDashboardFilter('delivery', s)}
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
                  active={dashboardFilter.type === 'collection' && dashboardFilter.value === key}
                  onClick={() => handleDashboardFilter('collection', key)}
                />
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardBody className="py-3 px-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search challan #, customer, cluster..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="h-6 w-px bg-surface-200 hidden sm:block" />

            {/* Date Pending Filter */}
            <select
              value={datePeriod}
              onChange={e => { setDatePeriod(e.target.value); setSelMonth(null); setSelYear(null); }}
              className="px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 min-w-[140px]"
            >
              <option value="">Select Date</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
            
            <div className="h-6 w-px bg-surface-200 hidden sm:block" />

            {/* All button */}
            <button
              onClick={() => { setSelYear(null); setSelMonth(null); setDatePeriod(''); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                selMonth === null && datePeriod === ''
                  ? 'bg-bhoomi-600 text-white border-bhoomi-600'
                  : 'bg-white text-surface-600 border-surface-300 hover:bg-surface-50'
              )}
            >
              All
            </button>

            {/* Month navigator */}
            <div className={cn(
              'flex items-center gap-1 border rounded-lg overflow-hidden transition-colors',
              selMonth !== null ? 'border-bhoomi-400' : 'border-surface-300',
              'bg-white'
            )}>
              <button onClick={prevMonth} className="p-2 hover:bg-surface-100 transition-colors">
                <ChevronLeft className="h-4 w-4 text-surface-500" />
              </button>
              <button
                onClick={() => { if (selMonth === null) { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()); setDatePeriod(''); } }}
                className={cn(
                  'px-3 text-sm font-semibold min-w-[110px] text-center py-1.5 transition-colors',
                  selMonth !== null ? 'text-bhoomi-700' : 'text-surface-400 italic'
                )}
              >
                {selMonth !== null ? `${MONTHS[selMonth]} ${selYear}` : 'Pick month'}
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-surface-100 transition-colors">
                <ChevronRight className="h-4 w-4 text-surface-500" />
              </button>
            </div>
            
            {/* Show active total count */}
            {data.totalElements > 0 && (
              <span className="ml-auto text-xs text-surface-500">
                {data.totalElements} challan{data.totalElements !== 1 ? 's' : ''}
              </span>
            )}
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
                    <Th col="status" label="Delivery Status" />
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wide whitespace-nowrap">Collection Status</th>
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
                    data.content.map(c => {
                      const st = STATUS_META[c.status] || STATUS_META.SAVED
                      const balance = (c.totalAmount || 0) - (c.totalCollected || 0)
                      
                      let colStatusLabel = 'Outstanding'
                      let colStatusBg = 'bg-red-50 text-red-700'
                      if ((c.totalCollected || 0) > 0) {
                        if (balance <= 0) {
                          colStatusLabel = 'Fully Paid'
                          colStatusBg = 'bg-green-50 text-green-700'
                        } else {
                          colStatusLabel = 'Partially Paid'
                          colStatusBg = 'bg-amber-50 text-amber-700'
                        }
                      }
                      
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
                          </td>
                          <td className="px-3 py-3 text-surface-600 whitespace-nowrap">{c.clusterSnapshot || '—'}</td>
                          <td className="px-3 py-3 text-surface-700 whitespace-nowrap">{c.totalCases ?? '—'}</td>
                          <td className="px-3 py-3 font-medium text-surface-900 whitespace-nowrap">{fmtMoney(c.totalAmount)}</td>
                          <td className="px-3 py-3 text-green-700 font-medium whitespace-nowrap">{fmtMoney(c.totalCollected)}</td>
                          
                          <td className="px-3 py-3">
                            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', st.bg)}>
                              {st.label}
                            </span>
                          </td>
                          
                          <td className="px-3 py-3">
                            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', colStatusBg)}>
                              {colStatusLabel}
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
"""

with open('src/pages/challans/ChallanListPage.jsx', 'w') as f:
    f.write(new_content)
