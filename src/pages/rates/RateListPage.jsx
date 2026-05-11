import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Search, X } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { listRates } from '@/api/rates'
import { listClusters } from '@/api/clusters'
import { ROUTES } from '@/utils/constants'
import { cn } from '@/utils/helpers'

// ── helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_META = {
  SAVED:               { label: 'Saved',              variant: 'default' },
  APPROVED:            { label: 'Approved',            variant: 'green'   },
  FULFILLED_PARTIALLY: { label: 'Fulfilled Partially', variant: 'amber'   },
  FULFILLED_FULLY:     { label: 'Fulfilled Fully',     variant: 'blue'    },
  SALES_LOST:          { label: 'Sales Lost',          variant: 'red'     },
  CLOSED:              { label: 'Closed',              variant: 'default' },
  EXPIRED:             { label: 'Expired',             variant: 'red'     },
}

const isoToDisplay = (d) => {
  if (!d) return '—'
  const parts = String(d).split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}-${MONTHS[parseInt(parts[1], 10) - 1]}-${parts[0]}`
}

const firstOfMonth = (y, m) =>
  `${y}-${String(m + 1).padStart(2, '0')}-01`

const lastOfMonth = (y, m) => {
  const d = new Date(y, m + 1, 0)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Sort header button ─────────────────────────────────────────────────────────

function SortTh({ field, label, sortField, sortDir, onSort, className }) {
  const active = sortField === field
  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th
      className={cn('px-4 py-3 text-left text-xs font-medium text-surface-500 cursor-pointer select-none whitespace-nowrap', className)}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={cn('h-3 w-3', active ? 'text-bhoomi-600' : 'text-surface-400')} />
      </span>
    </th>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export default function RateListPage() {
  const navigate = useNavigate()
  const now = new Date()

  // Month selector — null = All
  const [selYear, setSelYear] = useState(null)
  const [selMonth, setSelMonth] = useState(null) // 0-indexed, null = All

  // Search inputs (debounced)
  const [quoteInput, setQuoteInput] = useState('')
  const [custInput, setCustInput] = useState('')
  const [poInput, setPoInput] = useState('')

  // Debounced search values
  const [quoteSearch, setQuoteSearch] = useState('')
  const [custSearch, setCustSearch] = useState('')
  const [poSearch, setPoSearch] = useState('')

  // Filters (dropdowns)
  const [clusterFilter, setClusterFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [validTillStatus, setValidTillStatus] = useState('')

  // Clusters for dropdown
  const [clusters, setClusters] = useState([])

  // Sort
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState('desc')

  // Pagination
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const [rates, setRates] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Load clusters once
  useEffect(() => {
    listClusters()
      .then((data) => setClusters(Array.isArray(data) ? data : (data?.content || [])))
      .catch(() => {})
  }, [])

  // Debounce
  useEffect(() => { const t = setTimeout(() => setQuoteSearch(quoteInput), 300); return () => clearTimeout(t) }, [quoteInput])
  useEffect(() => { const t = setTimeout(() => setCustSearch(custInput), 300); return () => clearTimeout(t) }, [custInput])
  useEffect(() => { const t = setTimeout(() => setPoSearch(poInput), 300); return () => clearTimeout(t) }, [poInput])

  // Reset page on any filter change
  useEffect(() => { setPage(0) }, [selYear, selMonth, quoteSearch, custSearch, poSearch, clusterFilter, statusFilter, validTillStatus, sortField, sortDir])

  // Combined q — backend searches quoteNumber, customerName, poNumber
  const combinedQ = quoteSearch || custSearch || poSearch || undefined

  useEffect(() => {
    setLoading(true)
    listRates({
      from: selMonth !== null ? firstOfMonth(selYear, selMonth) : undefined,
      to: selMonth !== null ? lastOfMonth(selYear, selMonth) : undefined,
      q: combinedQ,
      cluster: clusterFilter || undefined,
      status: statusFilter || undefined,
      validTillStatus: validTillStatus || undefined,
      page,
      size: PAGE_SIZE,
      sort: `${sortField},${sortDir}`,
    })
      .then((data) => {
        setRates(data?.content || [])
        setTotal(data?.totalElements || 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selYear, selMonth, combinedQ, clusterFilter, statusFilter, validTillStatus, page, sortField, sortDir])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const prevMonth = () => {
    if (selMonth === null) { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()); return }
    if (selMonth === 0) { setSelYear((y) => y - 1); setSelMonth(11) }
    else setSelMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (selMonth === null) { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()); return }
    if (selMonth === 11) { setSelYear((y) => y + 1); setSelMonth(0) }
    else setSelMonth((m) => m + 1)
  }

  const clearFilters = () => {
    setQuoteInput(''); setCustInput(''); setPoInput('')
    setClusterFilter(''); setStatusFilter(''); setValidTillStatus('')
  }

  const hasActiveFilters = quoteInput || custInput || poInput || clusterFilter || statusFilter || validTillStatus

  return (
    <AppLayout
      title="Rate Quotes"
      subtitle="Bhoomi Enterprises · Rates"
      breadcrumbs={['Bhoomi Enterprises', 'Rates']}
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(ROUTES.RATES_NEW)}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          New Rate
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4">

        {/* ── Filter Bar ── */}
        <Card>
          <CardBody className="py-3 px-4 flex flex-wrap items-center gap-3">

            {/* All button */}
            <button
              onClick={() => { setSelYear(null); setSelMonth(null) }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                selMonth === null
                  ? 'bg-bhoomi-600 text-white border-bhoomi-600'
                  : 'bg-white text-surface-600 border-surface-300 hover:bg-surface-50'
              )}
            >
              All
            </button>

            {/* Month navigator */}
            <div className={cn(
              'flex items-center gap-1 border rounded-lg overflow-hidden transition-colors',
              selMonth !== null ? 'border-bhoomi-400' : 'border-surface-300'
            )}>
              <button onClick={prevMonth} className="p-2 hover:bg-surface-100 transition-colors">
                <ChevronLeft className="h-4 w-4 text-surface-500" />
              </button>
              <button
                onClick={() => { if (selMonth === null) { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()) } }}
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

            <div className="h-6 w-px bg-surface-200" />

            {/* Cluster filter */}
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:border-bhoomi-500 focus:outline-none"
            >
              <option value="">All Clusters</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:border-bhoomi-500 focus:outline-none"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* Valid Till filter */}
            <select
              value={validTillStatus}
              onChange={(e) => setValidTillStatus(e.target.value)}
              className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:border-bhoomi-500 focus:outline-none"
            >
              <option value="">Open &amp; Expired</option>
              <option value="OPEN">Open only</option>
              <option value="EXPIRED">Expired only</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-surface-500 hover:text-red-600 transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}

            {total > 0 && (
              <span className="ml-auto text-xs text-surface-500">
                {total} quote{total !== 1 ? 's' : ''}
              </span>
            )}
          </CardBody>
        </Card>

        {/* ── Search Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchInput
            value={quoteInput}
            onChange={setQuoteInput}
            placeholder="Search Quote #…"
          />
          <SearchInput
            value={custInput}
            onChange={setCustInput}
            placeholder="Search Customer…"
          />
          <SearchInput
            value={poInput}
            onChange={setPoInput}
            placeholder="Search PO #…"
          />
        </div>

        {/* ── Table ── */}
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50">
                    <SortTh field="quoteNumber"     label="QUOTE #"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh field="rateDate"        label="DATE"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh field="customerName"    label="CUSTOMER"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh field="clusterSnapshot" label="CLUSTER"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh field="poNumber"        label="PO #"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh field="validTill"       label="VALID TILL" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-center text-xs font-medium text-surface-500"># SKUs</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-surface-500">CASES</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-500">AMOUNT</th>
                    <SortTh field="status" label="STATUS" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="text-center" />
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={10} className="py-14 text-center">
                        <Spinner className="mx-auto" />
                      </td>
                    </tr>
                  )}
                  {!loading && rates.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-14 text-center text-sm text-surface-400">
                        {selMonth !== null
                          ? `No rate quotes for ${MONTHS[selMonth]} ${selYear}.`
                          : 'No rate quotes found.'}
                      </td>
                    </tr>
                  )}
                  {!loading && rates.map((r) => (
                    <RateRow key={r.id} rate={r} onOpen={() => navigate(`/rates/${r.id}/edit`)} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-surface-100">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-surface-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}

// ── Search Input helper ────────────────────────────────────────────────────────

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-300 bg-white pl-8 pr-8 py-2 text-sm focus:border-bhoomi-500 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ── Rate Row ──────────────────────────────────────────────────────────────────

function RateRow({ rate, onOpen }) {
  const today = new Date().toISOString().slice(0, 10)
  const expired = rate.validTill && rate.validTill < today
  const statusMeta = STATUS_META[rate.status] || { label: rate.status, variant: 'default' }

  return (
    <tr
      onClick={onOpen}
      className="border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors"
    >
      {/* Quote # */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-bhoomi-700">{rate.quoteNumber || '—'}</span>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-xs text-surface-700 whitespace-nowrap">
        {isoToDisplay(rate.rateDate)}
      </td>

      {/* Customer */}
      <td className="px-4 py-3">
        <span className="font-medium text-surface-900 text-xs">{rate.customerName || '—'}</span>
      </td>

      {/* Cluster */}
      <td className="px-4 py-3">
        {rate.clusterSnapshot ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {rate.clusterSnapshot}
          </span>
        ) : <span className="text-surface-400 text-xs">—</span>}
      </td>

      {/* PO # */}
      <td className="px-4 py-3 text-xs text-surface-600">
        {rate.poNumber || <span className="text-surface-300">—</span>}
      </td>

      {/* Valid Till */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-surface-700 whitespace-nowrap">{isoToDisplay(rate.validTill)}</span>
          <span className={cn(
            'text-[9px] px-1.5 py-0.5 rounded font-semibold w-fit',
            expired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          )}>
            {expired ? 'Expired' : 'Open'}
          </span>
        </div>
      </td>

      {/* # SKUs */}
      <td className="px-4 py-3 text-center text-xs text-surface-700">{rate.items?.length ?? '—'}</td>

      {/* Cases */}
      <td className="px-4 py-3 text-center text-xs text-surface-700">{rate.totalCases ?? '—'}</td>

      {/* Amount */}
      <td className="px-4 py-3 text-right text-xs font-medium text-surface-900">
        {rate.totalAmount != null
          ? '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(rate.totalAmount)
          : '—'}
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <Badge variant={statusMeta.variant} size="sm">{statusMeta.label}</Badge>
      </td>
    </tr>
  )
}
