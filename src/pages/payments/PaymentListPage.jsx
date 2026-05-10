import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { listPayments } from '@/api/payments'
import { ROUTES } from '@/utils/constants'
import RecordPaymentModal from './RecordPaymentModal'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default function PaymentListPage() {
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
    setLoading(true)
    try {
      const { from, to } = getDateRange()
      const result = await listPayments({ from, to, page, size: 20 })
      setData(result || { content: [], totalElements: 0 })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filterMonth, page, getDateRange])

  useEffect(() => { load() }, [load])

  const totalPaid = data.content?.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0) || 0

  const filtered = (data.content || []).filter(r =>
    !search ||
    r.partyName?.toLowerCase().includes(search.toLowerCase()) ||
    r.invoiceRef?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout
      title="Payments"
      breadcrumbs={['Finance', 'Payments']}
      actions={
        <Button onClick={() => setShowRecord(true)}>
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="text-xs font-semibold text-surface-500 uppercase">Total Paid</div>
            <div className="text-2xl font-bold text-green-700 mt-1">{fmtMoney(totalPaid)}</div>
            <div className="text-xs text-surface-400 mt-0.5">{data.totalElements} records</div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardBody className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search party or invoice..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
            </div>
            <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(0) }}
              className="px-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none">
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
                    {['Payment Date', 'Invoice / Ref', 'Billing Party', 'Invoice Amount', 'Cash Paid', 'Paid By', 'Type'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-surface-500">No payments found.</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="hover:bg-surface-50 cursor-pointer" onClick={() => navigate(ROUTES.PAYMENT_VIEW.replace(':id', p.id))}>
                      <td className="px-3 py-3 text-surface-700">{fmtDate(p.paymentDate)}</td>
                      <td className="px-3 py-3 text-bhoomi-700 font-medium">{p.invoiceRef || '—'}</td>
                      <td className="px-3 py-3 text-surface-900 font-medium">{p.partyName}</td>
                      <td className="px-3 py-3 text-surface-700">{fmtMoney(p.invoiceAmount)}</td>
                      <td className="px-3 py-3 font-semibold text-green-700">{fmtMoney(p.paidAmount)}</td>
                      <td className="px-3 py-3 text-surface-600">{p.paidBy}</td>
                      <td className="px-3 py-3 text-surface-500 text-xs">{p.type}</td>
                    </tr>
                  ))}
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
        <RecordPaymentModal onClose={() => setShowRecord(false)} onSuccess={() => { setShowRecord(false); load() }} />
      )}
    </AppLayout>
  )
}
