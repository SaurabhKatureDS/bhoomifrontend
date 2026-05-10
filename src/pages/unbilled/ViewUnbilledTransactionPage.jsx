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
  const totalPaid = payments.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0)
  const cashDue = (tx.totalCashToBePaid || 0) - totalPaid

  return (
    <AppLayout
      title={tx.zohoInvoiceRef || `Transaction #${id}`}
      breadcrumbs={['Finance', 'Unbilled Transactions', tx.zohoInvoiceRef || id]}
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
              <div><dt className="text-xs text-surface-500 font-medium">Billing Party</dt><dd className="text-sm font-semibold">{tx.partyName}</dd></div>
              <div><dt className="text-xs text-surface-500 font-medium">Location</dt><dd className="text-sm">{tx.locationName || '—'}</dd></div>
              <div><dt className="text-xs text-surface-500 font-medium">Zoho Ref #</dt><dd className="text-sm text-bhoomi-700 font-medium">{tx.zohoInvoiceRef || '—'}</dd></div>
              <div><dt className="text-xs text-surface-500 font-medium">Zoho Value</dt><dd className="text-sm">{fmtMoney(tx.zohoInvoiceValue)}</dd></div>
              <div><dt className="text-xs text-surface-500 font-medium">Challan Value</dt><dd className="text-sm">{fmtMoney(tx.challanInvoiceValue)}</dd></div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Difference</dt>
                <dd className={`text-sm font-semibold ${Math.abs((tx.zohoInvoiceValue || 0) - (tx.challanInvoiceValue || 0)) < 1 ? 'text-green-700' : 'text-red-600'}`}>
                  {tx.zohoInvoiceValue ? (Math.abs((tx.zohoInvoiceValue || 0) - (tx.challanInvoiceValue || 0)) < 1 ? '✓ Matched' : `₹${((tx.zohoInvoiceValue || 0) - (tx.challanInvoiceValue || 0)).toFixed(2)}`) : '—'}
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
                  {(tx.items || []).map((item, i) => (
                    <tr key={i}>
                      <td className="px-2 py-2 text-surface-800 font-medium">{item.productName}</td>
                      <td className="px-2 py-2 text-surface-500">{item.sku}</td>
                      <td className="px-2 py-2 text-surface-600">{item.mrp ? `₹${item.mrp}` : '—'}</td>
                      <td className="px-2 py-2 text-surface-500">{item.gstRate ? `${item.gstRate}%` : '—'}</td>
                      <td className="px-2 py-2 text-surface-500">{item.packing}</td>
                      <td className="px-2 py-2 font-medium text-surface-900">{item.cases}</td>
                      <td className="px-2 py-2 text-surface-700">{(item.cases || 0) * (item.packing || 1)}</td>
                      <td className="px-2 py-2 text-surface-700">{item.invoiceRate ? `₹${item.invoiceRate}` : '—'}</td>
                      <td className="px-2 py-2 font-medium text-surface-900">{fmtMoney(item.invoiceValue)}</td>
                      <td className="px-2 py-2 text-surface-500">{item.commissionPct ? `${item.commissionPct}%` : '—'}</td>
                      <td className="px-2 py-2 text-surface-700">{fmtMoney(item.commissionAmount)}</td>
                      <td className="px-2 py-2 font-semibold text-surface-900">{fmtMoney(item.cashToBePaid)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-300 bg-surface-50 font-bold">
                    <td colSpan={8} className="px-2 py-3 text-right text-surface-700">Totals</td>
                    <td className="px-2 py-3 text-surface-900">{fmtMoney(tx.challanInvoiceValue)}</td>
                    <td />
                    <td className="px-2 py-3 text-surface-700">{fmtMoney(tx.totalCommissionAmount)}</td>
                    <td className="px-2 py-3 text-surface-900">{fmtMoney(tx.totalCashToBePaid)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Payments */}
          <Card>
            <div className="px-4 py-3 border-b border-surface-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-surface-800">Payment Status</h3>
                <div className="flex gap-4 mt-1 text-xs">
                  <span className="text-green-700 font-medium">Paid: {fmtMoney(totalPaid)}</span>
                  <span className={`font-medium ${cashDue > 0 ? 'text-red-600' : 'text-surface-500'}`}>Due: {cashDue > 0 ? fmtMoney(cashDue) : '—'}</span>
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
                      <td className="px-3 py-2 text-surface-700">{p.paidBy}</td>
                      <td className="px-3 py-2 text-surface-500 text-xs">{p.type}</td>
                      <td className="px-3 py-2 font-semibold text-green-700">{fmtMoney(p.paidAmount)}</td>
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
                {timeline.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-bhoomi-100 text-bhoomi-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div>
                      <div className="text-sm font-semibold text-surface-800">{t.status}</div>
                      <div className="text-xs text-surface-500">{fmtDateTime(t.eventAt)}{t.userName ? ` · ${t.userName}` : ''}</div>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && <div className="text-xs text-surface-400">No timeline entries.</div>}
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
