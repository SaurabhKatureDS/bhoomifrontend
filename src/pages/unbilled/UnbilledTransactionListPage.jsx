import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { listUnbilledTransactions } from '@/api/unbilledTransactions'
import { cn } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

const STATUS_META = {
  SAVED:           { label: 'Saved',           variant: 'default' },
  PUSHED_TO_ZOHO:  { label: 'Pushed to Zoho',  variant: 'blue' },
  VERIFIED:        { label: 'Verified',         variant: 'purple' },
  CLOSED:          { label: 'Closed',           variant: 'green' },
}

export default function UnbilledTransactionListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ content: [], totalElements: 0 })
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listUnbilledTransactions({ status: filterStatus || undefined, page, size: 20 })
      setData(result || { content: [], totalElements: 0 })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filterStatus, page])

  useEffect(() => { load() }, [load])

  const filtered = (data.content || []).filter(r =>
    !search ||
    r.partyName?.toLowerCase().includes(search.toLowerCase()) ||
    r.zohoInvoiceRef?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout
      title="Unbilled Transactions"
      breadcrumbs={['Finance', 'Unbilled Transactions']}
      actions={
        <Button onClick={() => navigate(ROUTES.UNBILLED_TRANSACTION_NEW)}>
          <Plus className="h-4 w-4" /> New Transaction
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-6">
        <Card>
          <CardBody className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search party or invoice ref..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
            </div>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
              className="px-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                    {['Date', 'Billing Party', 'Location', 'Zoho Ref #', 'Zoho Value', 'Challan Value', 'Commission', 'Cash Due', 'Status'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-sm text-surface-500">No transactions found.</td></tr>
                  ) : filtered.map(r => {
                    const sm = STATUS_META[r.status] || STATUS_META.SAVED
                    return (
                      <tr key={r.id} className="hover:bg-surface-50 cursor-pointer" onClick={() => navigate(ROUTES.UNBILLED_TRANSACTION_VIEW.replace(':id', r.id))}>
                        <td className="px-3 py-3 text-surface-600">{fmtDate(r.transactionDate || r.createdAt)}</td>
                        <td className="px-3 py-3 font-medium text-surface-900">{r.partyName}</td>
                        <td className="px-3 py-3 text-surface-600">{r.locationName || '—'}</td>
                        <td className="px-3 py-3 text-bhoomi-700">{r.zohoInvoiceRef || '—'}</td>
                        <td className="px-3 py-3 text-surface-700">{fmtMoney(r.zohoInvoiceValue)}</td>
                        <td className="px-3 py-3 text-surface-700">{fmtMoney(r.challanInvoiceValue)}</td>
                        <td className="px-3 py-3 text-surface-700">{fmtMoney(r.totalCommissionAmount)}</td>
                        <td className="px-3 py-3 font-medium text-surface-900">{fmtMoney(r.totalCashToBePaid)}</td>
                        <td className="px-3 py-3">
                          <Badge variant={sm.variant}>{sm.label}</Badge>
                        </td>
                      </tr>
                    )
                  })}
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
    </AppLayout>
  )
}
