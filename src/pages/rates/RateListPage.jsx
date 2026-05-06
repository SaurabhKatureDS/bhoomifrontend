import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { listRates } from '@/api/rates'
import { ROUTES } from '@/utils/constants'
import { cn } from '@/utils/helpers'

// ── helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_META = {
  SAVED:                { label: 'Draft Saved',          variant: 'default' },
  APPROVED:             { label: 'Approved',             variant: 'green'   },
  FULFILLED_PARTIALLY:  { label: 'Fulfilled Partially',  variant: 'amber'   },
  FULFILLED_FULLY:      { label: 'Fulfilled Fully',      variant: 'blue'    },
  SALES_LOST:           { label: 'Sales Lost',           variant: 'red'     },
  CLOSED:               { label: 'Closed',               variant: 'default' },
  EXPIRED:              { label: 'Expired',              variant: 'red'     },
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

export default function RateListPage() {
  const navigate = useNavigate()
  const now = new Date()

  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth()) // 0-indexed

  const [statusFilter, setStatusFilter] = useState('')
  const [custSearch, setCustSearch] = useState('')
  const [custInput, setCustInput] = useState('')

  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const [rates, setRates] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // debounce customer search
  useEffect(() => {
    const t = setTimeout(() => setCustSearch(custInput), 300)
    return () => clearTimeout(t)
  }, [custInput])

  // reset page on filter change
  useEffect(() => { setPage(0) }, [selYear, selMonth, statusFilter, custSearch])

  useEffect(() => {
    setLoading(true)
    listRates({
      from: firstOfMonth(selYear, selMonth),
      to: lastOfMonth(selYear, selMonth),
      status: statusFilter || undefined,
      q: custSearch || undefined,
      page,
      size: PAGE_SIZE,
      sort: 'rateDate,desc',
    })
      .then((data) => {
        setRates(data?.content || [])
        setTotal(data?.totalElements || 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selYear, selMonth, statusFilter, custSearch, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const prevMonth = () => {
    if (selMonth === 0) { setSelYear((y) => y - 1); setSelMonth(11) }
    else setSelMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (selMonth === 11) { setSelYear((y) => y + 1); setSelMonth(0) }
    else setSelMonth((m) => m + 1)
  }

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
          New Quote
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* ── Filters ── */}
        <Card>
          <CardBody className="py-3 px-4 flex flex-wrap items-center gap-3">
            {/* Month navigator */}
            <div className="flex items-center gap-2 border border-surface-300 rounded-lg overflow-hidden">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-surface-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-surface-500" />
              </button>
              <span className="px-3 text-sm font-semibold text-surface-800 min-w-[110px] text-center">
                {MONTHS[selMonth]} {selYear}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-surface-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-surface-500" />
              </button>
            </div>

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

            {/* Customer search */}
            <input
              value={custInput}
              onChange={(e) => setCustInput(e.target.value)}
              placeholder="Search customer…"
              className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm w-52 focus:border-bhoomi-500 focus:outline-none"
            />

            {total > 0 && (
              <span className="ml-auto text-xs text-surface-500">{total} quote{total !== 1 ? 's' : ''}</span>
            )}
          </CardBody>
        </Card>

        {/* ── Table ── */}
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">QUOTE #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">CUSTOMER</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">CLUSTER</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">PO #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">VALID TILL</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-surface-500">CASES</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-500">AMOUNT</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-surface-500">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={9} className="py-14 text-center">
                        <Spinner className="mx-auto" />
                      </td>
                    </tr>
                  )}
                  {!loading && rates.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-14 text-center text-sm text-surface-400">
                        No rate quotes for {MONTHS[selMonth]} {selYear}.
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
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-bhoomi-700">{rate.quoteNumber || '—'}</span>
      </td>
      <td className="px-4 py-3 text-xs text-surface-700">{isoToDisplay(rate.rateDate)}</td>
      <td className="px-4 py-3">
        <span className="font-medium text-surface-900 text-xs">{rate.customerName || '—'}</span>
      </td>
      <td className="px-4 py-3">
        {rate.clusterSnapshot ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {rate.clusterSnapshot}
          </span>
        ) : <span className="text-surface-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-surface-500">{rate.poNumber || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-surface-700">{isoToDisplay(rate.validTill)}</span>
          {rate.status !== 'EXPIRED' && rate.status !== 'CLOSED' && (
            <span className={cn(
              'text-[9px] px-1.5 py-0.5 rounded font-semibold',
              expired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            )}>
              {expired ? 'Expired' : 'Open'}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-xs text-surface-700">{rate.totalCases ?? '—'}</td>
      <td className="px-4 py-3 text-right text-xs font-medium text-surface-900">
        {rate.totalAmount != null
          ? '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(rate.totalAmount)
          : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <Badge variant={statusMeta.variant} size="sm">{statusMeta.label}</Badge>
      </td>
    </tr>
  )
}
