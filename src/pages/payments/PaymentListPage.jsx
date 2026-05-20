
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Layers, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { listPayments } from '@/api/payments'
import { listUnbilledTransactions } from '@/api/unbilledTransactions'
import { ROUTES } from '@/utils/constants'
import RecordPaymentModal from './RecordPaymentModal'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default function PaymentListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ content: [], totalElements: 0 })
  const [transactions, setTransactions] = useState([])
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('all')
  const [selectedCard, setSelectedCard] = useState('all') // 'all', 'OUTSTANDING', 'PARTIAL', 'FULLY'
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
      const [pays, txs] = await Promise.all([
        listPayments({ from, to, page, size: 50 }),
        listUnbilledTransactions({ size: 1000 }).catch(() => ({ content: [] }))
      ])
      setData(pays || { content: [], totalElements: 0 })
      setTransactions(txs?.content || txs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filterMonth, page, getDateRange])

  useEffect(() => { load() }, [load])

  // Compute dashboard metrics from transactions
  const metrics = transactions.reduce((acc, t) => {
    const amt = Number(t.totalAmount) || 0
    const paid = Number(t.totalPaid) || 0
    const status = t.status || 'SAVED'

    if (paid >= amt && amt > 0) {
      acc.fully.count++
      acc.fully.sum += amt
    } else if (paid > 0 && paid < amt) {
      acc.partial.count++
      acc.partial.sum += (amt - paid)
    } else {
      acc.outstanding.count++
      acc.outstanding.sum += amt
    }
    return acc
  }, {
    outstanding: { count: 0, sum: 0 },
    partial: { count: 0, sum: 0 },
    fully: { count: 0, sum: 0 }
  })

  // Filter payments
  const filtered = (data.content || []).filter(p => {
    const party = p.billingPartyName || p.partyName || ''
    
    // Comma-separated list of allocation invoice refs
    const allocRefs = (p.allocations || []).map(a => a.zohoInvoiceId || a.transactionNumber || `TXN-${a.unbilledTransactionId}`).join(', ')
    
    // Search filter
    const matchesSearch = !search ||
      party.toLowerCase().includes(search.toLowerCase()) ||
      allocRefs.toLowerCase().includes(search.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    // Dashboard card filters
    if (selectedCard === 'OUTSTANDING') {
      // Show advance, on-account, or unpaid allocations
      return p.type === 'ADVANCE' || p.type === 'ON_ACCOUNT'
    }
    if (selectedCard === 'PARTIAL') {
      // Has some allocations but has remaining amount or adjusted
      return p.type === 'AGAINST_INVOICE' && (p.allocations && p.allocations.length > 0)
    }
    if (selectedCard === 'FULLY') {
      // Full payment against specific invoice
      return p.type === 'AGAINST_INVOICE' && p.amount >= 10000
    }

    return true
  })

  return (
    <AppLayout
      title="Payments & Collections"
      breadcrumbs={['Finance', 'Payments']}
      actions={
        <Button onClick={() => setShowRecord(true)}>
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-6">
        
        {/* Dynamic Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Outstanding Card (Red) */}
          <button
            onClick={() => setSelectedCard(prev => prev === 'OUTSTANDING' ? 'all' : 'OUTSTANDING')}
            className={`text-left rounded-xl border p-4 transition-all duration-200 ${
              selectedCard === 'OUTSTANDING'
                ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50 shadow-md scale-[1.02]'
                : 'border-surface-200 bg-white hover:border-red-300 hover:shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Outstanding (Unbilled)</span>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-extrabold text-red-950 mt-2">{fmtMoney(metrics.outstanding.sum)}</div>
            <div className="text-xs text-red-700 mt-1 font-medium">{metrics.outstanding.count} Pending Challans</div>
          </button>

          {/* Partially Paid Card (Yellow) */}
          <button
            onClick={() => setSelectedCard(prev => prev === 'PARTIAL' ? 'all' : 'PARTIAL')}
            className={`text-left rounded-xl border p-4 transition-all duration-200 ${
              selectedCard === 'PARTIAL'
                ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/50 shadow-md scale-[1.02]'
                : 'border-surface-200 bg-white hover:border-amber-300 hover:shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Partially Paid</span>
              <Layers className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-950 mt-2">{fmtMoney(metrics.partial.sum)}</div>
            <div className="text-xs text-amber-700 mt-1 font-medium">{metrics.partial.count} Partial Balances</div>
          </button>

          {/* Fully Paid Card (Green) */}
          <button
            onClick={() => setSelectedCard(prev => prev === 'FULLY' ? 'all' : 'FULLY')}
            className={`text-left rounded-xl border p-4 transition-all duration-200 ${
              selectedCard === 'FULLY'
                ? 'border-green-500 ring-2 ring-green-500/20 bg-green-50/50 shadow-md scale-[1.02]'
                : 'border-surface-200 bg-white hover:border-green-300 hover:shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Fully Paid</span>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-extrabold text-green-950 mt-2">{fmtMoney(metrics.fully.sum)}</div>
            <div className="text-xs text-green-700 mt-1 font-medium">{metrics.fully.count} Completed Invoices</div>
          </button>
        </div>

        {/* Filters */}
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search billing party or invoice ref..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 font-medium" />
            </div>
            <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(0) }}
              className="px-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none font-semibold text-surface-700">
              <option value="all">All Months</option>
              <option value="this">This Month</option>
              <option value="last">Last Month</option>
            </select>
            {selectedCard !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedCard('all')} className="text-xs">
                Clear Card Filter
              </Button>
            )}
          </CardBody>
        </Card>

        {/* Table List */}
        <Card>
          {loading ? (
            <CardBody className="flex justify-center py-16"><Spinner className="h-8 w-8" /></CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    {['Payment Date', 'Invoice(s) / Ref', 'Billing Party', 'Cash Paid', 'Paid By', 'Type'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-surface-500">No matching payments found.</td></tr>
                  ) : filtered.map(p => {
                    const party = p.billingPartyName || p.partyName || '—'
                    const amt = p.amount ?? p.paidAmount ?? 0
                    
                    // Comma-separated list of allocation invoice refs
                    const allocRefs = (p.allocations || []).map(a => a.zohoInvoiceId || a.transactionNumber || `TXN-${a.unbilledTransactionId}`).join(', ')
                    
                    return (
                      <tr key={p.id} className="hover:bg-surface-50 cursor-pointer" onClick={() => navigate(ROUTES.PAYMENT_VIEW.replace(':id', p.id))}>
                        <td className="px-4 py-3 text-surface-700 font-medium whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                        <td className="px-4 py-3 text-bhoomi-700 font-semibold max-w-xs truncate">{allocRefs || p.type || '—'}</td>
                        <td className="px-4 py-3 text-surface-900 font-bold">{party}</td>
                        <td className="px-4 py-3 font-extrabold text-green-700">{fmtMoney(amt)}</td>
                        <td className="px-4 py-3 text-surface-600 font-medium">{p.paidBy || '—'}</td>
                        <td className="px-4 py-3 text-surface-500 text-xs font-semibold">{p.type}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {data.totalElements > 50 && (
            <div className="border-t border-surface-200 px-4 py-3">
              <Pagination page={page} pageSize={50} total={data.totalElements} onChange={setPage} />
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
