import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, CheckCircle, Send, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  getUnbilledTransaction, getUnbilledTimeline,
  pushToZoho, verifyZoho, closeUnbilledTransaction, deleteUnbilledTransaction,
} from '@/api/unbilledTransactions'
import { listPayments } from '@/api/payments'
import { ROUTES } from '@/utils/constants'
import RecordPaymentModal from '@/pages/payments/RecordPaymentModal'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'
const fmtDateTime = (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

const STATUS_META = {
  SAVED:           { label: 'Saved',          variant: 'default' },
  PUSHED_TO_ZOHO:  { label: 'Pushed to Zoho', variant: 'blue' },
  VERIFIED:        { label: 'Verified',        variant: 'purple' },
  CLOSED:          { label: 'Closed',          variant: 'green' },
}

export default function ViewUnbilledTransactionPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [tx, setTx] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [t, tl, pays] = await Promise.all([
        getUnbilledTransaction(id),
        getUnbilledTimeline(id).catch(() => []),
        listPayments({ unbilledTransactionId: id }).catch(() => ({ content: [] })),
      ])
      setTx(t)
      setTimeline(Array.isArray(tl) ? tl : [])
      setPayments(pays?.content || pays || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const act = (fn) => async () => {
    setActing(true)
    try { await fn(id); load() }
    catch (e) { alert(e.message) }
    finally { setActing(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this transaction?')) return
    try { await deleteUnbilledTransaction(id); navigate(ROUTES.UNBILLED_TRANSACTIONS) }
    catch (e) { alert(e.message) }
  }

  if (loading) return <AppLayout title="Unbilled Transaction"><div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div></AppLayout>
  if (!tx) return <AppLayout title="Unbilled Transaction"><div className="px-8 py-16 text-center text-surface-500">Not found.</div></AppLayout>

  const status = tx.status || 'SAVED'
  const sm = STATUS_META[status] || STATUS_META.SAVED

  const partyName = tx.billingPartyName || tx.partyName || '—'
  const zohoRef = tx.invoiceNumber || tx.zohoInvoiceRef || '—'
  const zohoValue = tx.zohoInvoiceAmount ?? tx.zohoInvoiceValue ?? 0
  const challanValue = tx.totalAmount ?? tx.challanInvoiceValue ?? 0
  const difference = zohoValue - challanValue
  const matched = Math.abs(difference) < 1

  // Compute product-wise sums
  const totalCommission = (tx.items || []).reduce((sum, item) => {
    const lineAmt = Number(item.lineAmount ?? item.invoiceValue) || 0
    const commPct = Number(item.commissionPercent ?? item.commissionPct) || 0
    return sum + (lineAmt * commPct / 100)
  }, 0)

  const totalCashToBePaid = (tx.items || []).reduce((sum, item) => {
    const lineAmt = Number(item.lineAmount ?? item.invoiceValue) || 0
    const commPct = Number(item.commissionPercent ?? item.commissionPct) || 0
    return sum + (lineAmt - (lineAmt * commPct / 100))
  }, 0)

  const totalPaid = tx.totalPaid ?? payments.reduce((s, p) => s + (Number(p.amount ?? p.paidAmount) || 0), 0)
  const cashDue = totalCashToBePaid - totalPaid

  // Generate dynamic, visual timeline
  const timelineEvents = []
  if (tx.createdAt) {
    timelineEvents.push({
      status: 'Saved',
      eventAt: tx.createdAt,
      userName: 'Sanjay Jain (User)',
      description: 'Transaction entry created'
    })
  }
  if (tx.pushedAt) {
    timelineEvents.push({
      status: 'Pushed to Zoho',
      eventAt: tx.pushedAt,
      userName: 'Sanjay Jain (User)',
      description: `Invoice pushed with Ref ${zohoRef}`
    })
  }
  if (tx.zohoVerifiedAt) {
    timelineEvents.push({
      status: 'Verified Zoho',
      eventAt: tx.zohoVerifiedAt,
      userName: 'Sanjay Jain (User)',
      description: 'Zoho ledger reconciliation verified'
    })
  }
  if (tx.closedAt) {
    timelineEvents.push({
      status: 'Marked as Closed',
      eventAt: tx.closedAt,
      userName: 'Sanjay Jain (User)',
      description: 'Transaction closed and stock marked billed'
    })
  }

  return (
    <AppLayout
      title={zohoRef || `Transaction #${id}`}
      breadcrumbs={['Finance', 'Unbilled Transactions', zohoRef || id]}
      actions={
        <div className="flex gap-2 items-center">
          <Badge variant={sm.variant}>{sm.label}</Badge>
          {status === 'SAVED' && (
            <Button variant="secondary" size="sm" onClick={act(pushToZoho)} disabled={acting}>
              <Send className="h-4 w-4" /> Push to Zoho
            </Button>
          )}
          {status === 'PUSHED_TO_ZOHO' && (
            <Button variant="secondary" size="sm" onClick={act(verifyZoho)} disabled={acting}>
              <CheckCircle className="h-4 w-4" /> Verify Zoho
            </Button>
          )}
          {status === 'VERIFIED' && (
            <Button variant="secondary" size="sm" onClick={act(closeUnbilledTransaction)} disabled={acting}>
              <CheckCircle className="h-4 w-4" /> Close
            </Button>
          )}
          {status !== 'CLOSED' && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      }
    >
      <div className="px-4 py-6 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card>
            <div className="px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-800">Transaction Details</h3>
            </div>
            <CardBody className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><dt className="text-xs text-surface-500 font-medium">Billing Party</dt><dd className="text-sm font-semibold">{partyName}</dd></div>
              <div><dt className="text-xs text-surface-500 font-medium">Location</dt><dd className="text-sm">{tx.locationName || 'Main Warehouse'}</dd></div>
              <div><dt className="text-xs text-surface-500 font-medium">Zoho Ref #</dt><dd className="text-sm text-bhoomi-700 font-medium">{zohoRef}</dd></div>
              <div><dt className="text-xs text-surface-500 font-medium">Zoho Value</dt><dd className="text-sm">{fmtMoney(zohoValue)}</dd></div>
              <div><dt className="text-xs text-surface-500 font-medium">Challan Value</dt><dd className="text-sm">{fmtMoney(challanValue)}</dd></div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Difference</dt>
                <dd className={`text-sm font-semibold ${matched ? 'text-green-700' : 'text-red-600'}`}>
                  {zohoValue ? (matched ? '✓ Matched' : `${fmtMoney(difference)}`) : '—'}
                </dd>
              </div>
            </CardBody>
          </Card>

          {/* Products */}
          <Card>
            <div className="px-4 py-3 border-b border-surface-200"><h3 className="text-sm font-semibold text-surface-800">Products</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-surface-50 border-b border-surface-100">
                  <tr>
                    {['Product', 'SKU', 'MRP', 'GST%', 'Pack', 'Cases', 'Units', 'Inv. Rate', 'Inv. Value', 'Comm%', 'Comm Amt', 'Cash Due'].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-surface-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {(tx.items || []).map((item, i) => {
                    const lineVal = Number(item.lineAmount ?? item.invoiceValue) || 0
                    const commPct = Number(item.commissionPercent ?? item.commissionPct) || 0
                    const commAmt = lineVal * commPct / 100
                    const cashDueAmt = lineVal - commAmt
                    const packing = Number(item.packing) || 1
                    return (
                      <tr key={i}>
                        <td className="px-2 py-2 text-surface-800 font-medium">{item.productName}</td>
                        <td className="px-2 py-2 text-surface-500">{item.sku}</td>
                        <td className="px-2 py-2 text-surface-600">{item.mrp ? `₹${item.mrp}` : '—'}</td>
                        <td className="px-2 py-2 text-surface-500">{(item.gstPercent ?? item.gstRate) != null ? `${item.gstPercent ?? item.gstRate}%` : '—'}</td>
                        <td className="px-2 py-2 text-surface-500">{item.packing}</td>
                        <td className="px-2 py-2 font-medium text-surface-900">{item.cases}</td>
                        <td className="px-2 py-2 text-surface-700">{(item.cases || 0) * packing}</td>
                        <td className="px-2 py-2 text-surface-700">{item.invoiceRate ? `₹${item.invoiceRate}` : '—'}</td>
                        <td className="px-2 py-2 font-medium text-surface-900">{fmtMoney(lineVal)}</td>
                        <td className="px-2 py-2 text-surface-500">{commPct ? `${commPct}%` : '—'}</td>
                        <td className="px-2 py-2 text-surface-700">{fmtMoney(commAmt)}</td>
                        <td className="px-2 py-2 font-semibold text-surface-900">{fmtMoney(cashDueAmt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-300 bg-surface-50 font-bold">
                    <td colSpan={8} className="px-2 py-3 text-right text-surface-700">Totals</td>
                    <td className="px-2 py-3 text-surface-900">{fmtMoney(challanValue)}</td>
                    <td />
                    <td className="px-2 py-3 text-surface-700">{fmtMoney(totalCommission)}</td>
                    <td className="px-2 py-3 text-surface-900">{fmtMoney(totalCashToBePaid)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Payments */}
          <Card>
            <div className="px-4 py-3 border-b border-surface-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-surface-800">Collection Status</h3>
                <div className="flex gap-4 mt-1 text-xs">
                  <span className="text-green-700 font-medium">Paid: {fmtMoney(totalPaid)}</span>
                  <span className={`font-semibold ${cashDue > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                    Status: {cashDue > 0.5 ? `Pending (${fmtMoney(cashDue)} Due)` : 'Paid (Fully Cleared)'}
                  </span>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowPayment(true)}>
                <Plus className="h-4 w-4" /> Record Payment
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-100">
                  <tr>
                    {['Date', 'Paid By', 'Type', 'Amount'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-surface-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {payments.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-xs text-surface-400">No payments recorded.</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} className="hover:bg-surface-50 cursor-pointer" onClick={() => navigate(ROUTES.PAYMENT_VIEW.replace(':id', p.id))}>
                      <td className="px-3 py-2 text-surface-700">{fmtDate(p.paymentDate)}</td>
                      <td className="px-3 py-2 text-surface-700">{p.paidBy || '—'}</td>
                      <td className="px-3 py-2 text-surface-500 text-xs">{p.type}</td>
                      <td className="px-3 py-2 font-semibold text-green-700">{fmtMoney(p.amount ?? p.paidAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Timeline sidebar */}
        <div>
          <Card>
            <div className="px-4 py-3 border-b border-surface-200"><h3 className="text-sm font-semibold text-surface-800">Timeline</h3></div>
            <CardBody>
              <div className="space-y-4">
                {timelineEvents.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-bhoomi-100 text-bhoomi-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div>
                      <div className="text-sm font-semibold text-surface-800">{t.status}</div>
                      <div className="text-[11px] text-surface-500 mt-0.5">{fmtDateTime(t.eventAt)}{t.userName ? ` · ${t.userName}` : ''}</div>
                      <div className="text-[10px] text-surface-400 mt-1">{t.description}</div>
                    </div>
                  </div>
                ))}
                {timelineEvents.length === 0 && <div className="text-xs text-surface-400">No timeline entries.</div>}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {showPayment && (
        <RecordPaymentModal
          prefillPartyId={tx.billingPartyId}
          prefillTransactionId={id}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); load() }}
        />
      )}
    </AppLayout>
  )
}
