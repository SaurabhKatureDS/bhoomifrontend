import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getPayment, deletePayment } from '@/api/payments'
import { ROUTES } from '@/utils/constants'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

import RecordPaymentModal from './RecordPaymentModal'

export default function ViewPaymentPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchPayment = () => {
    getPayment(id).then(setPayment).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPayment()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Delete this payment?')) return
    try {
      await deletePayment(id)
      navigate(ROUTES.PAYMENTS)
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <AppLayout title="Payment"><div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div></AppLayout>
  if (!payment) return <AppLayout title="Payment"><div className="px-8 py-16 text-center text-surface-500">Not found.</div></AppLayout>

  const partyName = payment.billingPartyName || payment.partyName || '—'
  const amountPaid = payment.amount ?? payment.paidAmount ?? 0

  return (
    <AppLayout
      title={`Payment — ${fmtDate(payment.paymentDate)}`}
      breadcrumbs={['Finance', 'Payments', partyName]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      }
    >
      <div className="px-4 py-6 md:px-8 max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Detail Panel */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <div className="px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-800">Payment Summary</h3>
            </div>
            <CardBody className="space-y-4 text-sm">
              <div>
                <dt className="text-xs text-surface-500 font-medium">Payment Date</dt>
                <dd className="text-sm font-semibold">{fmtDate(payment.paymentDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Billing Party</dt>
                <dd className="text-sm font-semibold text-surface-800">{partyName}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Payment Type</dt>
                <dd className="text-sm font-semibold text-surface-700">{payment.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Amount Paid</dt>
                <dd className="text-xl font-bold text-green-600">{fmtMoney(amountPaid)}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Paid By</dt>
                <dd className="text-sm">{payment.paidBy || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Notes</dt>
                <dd className="text-sm text-surface-600 whitespace-pre-wrap">{payment.notes || '—'}</dd>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Allocations Table */}
        <div className="md:col-span-2">
          <Card>
            <div className="px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-800">Invoice Allocations</h3>
            </div>
            <div className="overflow-x-auto">
              {payment.allocations && payment.allocations.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-surface-50 border-b border-surface-150">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-surface-500">Invoice Ref / ID</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-surface-500">Amount Adjusted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {payment.allocations.map(alloc => (
                      <tr key={alloc.id} className="hover:bg-surface-50/50">
                        <td className="px-4 py-3 font-semibold text-bhoomi-700">
                          {alloc.zohoInvoiceId || alloc.transactionNumber || `TXN-${alloc.unbilledTransactionId}`}
                        </td>
                        <td className="px-4 py-3 text-right text-surface-900 font-bold">
                          {fmtMoney(alloc.amountAdjusted)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 font-bold border-t border-surface-150">
                      <td className="px-4 py-3 text-surface-700">Total Allocated</td>
                      <td className="px-4 py-3 text-right text-surface-900">
                        {fmtMoney(payment.allocations.reduce((sum, item) => sum + (item.amountAdjusted || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="px-4 py-12 text-center text-surface-400 bg-white">
                  This payment was not adjusted against any specific invoices (Advance / On Account).
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {showEditModal && (
        <RecordPaymentModal
          prefillPayment={payment}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            setLoading(true)
            fetchPayment()
          }}
        />
      )}
    </AppLayout>
  )
}
