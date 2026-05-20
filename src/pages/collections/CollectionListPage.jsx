import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { listCollections } from '@/api/collections'
import { ROUTES } from '@/utils/constants'
import RecordCollectionModal from './RecordCollectionModal'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

const STATUS_META = {
  OUTSTANDING: { label: 'Outstanding', bg: 'bg-red-50 text-red-700' },
  PARTIAL: { label: 'Partially Paid', bg: 'bg-amber-50 text-amber-700' },
  FULL: { label: 'Fully Paid', bg: 'bg-green-50 text-green-700' },
}

const TYPE_LABELS = {
  ADVANCE: 'Advance',
  ON_ACCOUNT: 'On Account',
  AGAINST_DC: 'Against Delivery Challan',
}

const getCollectionStatus = (collection) => {
  const alloc = collection.allocations?.[0]
  if (!alloc || alloc.challanTotalAmount == null) return null
  const amount = Number(collection.amount || 0)
  const total = Number(alloc.challanTotalAmount || 0)
  if (amount >= total) return STATUS_META.FULL
  if (amount > 0) return STATUS_META.PARTIAL
  return STATUS_META.OUTSTANDING
}

export default function CollectionListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ content: [], totalElements: 0 })
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('this')
  const [showRecord, setShowRecord] = useState(false)

  const getDateRange = useCallback(() => {
    const now = new Date()
    if (filterMonth === 'this') return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    }
    if (filterMonth === 'last') return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
      to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
    }
    return {}
  }, [filterMonth])

  const load = useCallback(async () => {
    Promise.resolve().then(() => setLoading(true))
    try {
      const { from, to } = getDateRange()
      const result = await listCollections({ from, to, page, size: 20 })
      setData(result || { content: [], totalElements: 0 })
    } catch (e) {
      console.error(e)
    } finally {
      Promise.resolve().then(() => setLoading(false))
    }
  }, [filterMonth, page, getDateRange])

  useEffect(() => {
    Promise.resolve().then(() => load())
  }, [load])

  // Compute summary stats from data
  const totalCollected = data.content?.reduce((s, c) => s + (Number(c.amount) || 0), 0) || 0
  const totalChallanAmount = data.content?.reduce((s, c) => s + (Number(c.allocations?.[0]?.challanTotalAmount) || 0), 0) || 0

  const filtered = (data.content || []).filter(c =>
    !search ||
    c.challanNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.customerName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout
      title="Collections"
      breadcrumbs={['Cash Sales', 'Collections']}
      actions={
        <Button type="button" variant="gold" onClick={() => setShowRecord(true)}>
          <Plus className="h-4 w-4" /> Record Collection
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Total Collected</div>
            <div className="text-2xl font-bold text-green-700 mt-1">{fmtMoney(totalCollected)}</div>
            <div className="text-xs text-surface-400 mt-0.5">{data.totalElements} records</div>
          </div>
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Challan Value</div>
            <div className="text-2xl font-bold text-surface-800 mt-1">{fmtMoney(totalChallanAmount)}</div>
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
                placeholder="Search challan or customer..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
              />
            </div>
            <select
              value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value); setPage(0) }}
              className="px-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none"
            >
              <option value="this">This Month</option>
              <option value="last">Last Month</option>
              <option value="all">All</option>
            </select>
          </CardBody>
        </Card>

        <Card>
          {loading ? (
            <CardBody className="flex justify-center py-16"><Spinner className="h-8 w-8" /></CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Collection Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Challan #</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Customer</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-surface-600 uppercase">Challan Amt</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-surface-600 uppercase">Collected</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-surface-500">No collections found.</td></tr>
                  ) : (
                    filtered.map(c => (
                      <tr key={c.id} className="hover:bg-surface-50 cursor-pointer" onClick={() => navigate(ROUTES.COLLECTION_VIEW.replace(':id', c.id))}>
                        <td className="px-3 py-3 text-surface-700">{fmtDate(c.collectionDate)}</td>
                        <td className="px-3 py-3 text-bhoomi-700 font-medium">{c.allocations?.[0]?.challanNumber || '—'}</td>
                        <td className="px-3 py-3 text-surface-900">{c.customerName}</td>
                        <td className="px-3 py-3 text-right text-surface-700">{fmtMoney(c.allocations?.[0]?.challanTotalAmount)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-green-700">{fmtMoney(c.amount)}</td>
                        <td className="px-3 py-3">
                          {(() => {
                            const status = getCollectionStatus(c)
                            if (!status) return <span className="text-surface-500 text-xs">—</span>
                            return (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${status.bg}`}>
                                {status.label}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-3 py-3 text-surface-500 text-xs">{TYPE_LABELS[c.type] || c.type || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {data.totalElements > 20 && (
            <div className="border-t border-surface-200 px-4 py-3">
              <Pagination page={page} pageSize={20} total={data.totalElements} onChange={setPage} />
            </div>
          )}
        </Card>
      </div>

      {showRecord && (
        <RecordCollectionModal
          onClose={() => setShowRecord(false)}
          onSuccess={() => { setShowRecord(false); load() }}
        />
      )}
    </AppLayout>
  )
}
