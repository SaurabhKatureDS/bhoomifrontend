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

export default function ViewPaymentPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPayment(id).then(setPayment).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Delete this payment?')) return
    try { await deletePayment(id); navigate(ROUTES.PAYMENTS) }
    catch (e) { alert(e.message) }
  }

  if (loading) return <AppLayout title="Payment"><div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div></AppLayout>
  if (!payment) return <AppLayout title="Payment"><div className="px-8 py-16 text-center text-surface-500">Not found.</div></AppLayout>

  return (
    <AppLayout
      title={`Payment — ${fmtDate(payment.paymentDate)}`}
      breadcrumbs={['Finance', 'Payments', payment.partyName]}
      actions={
        <Button variant="danger" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 max-w-2xl space-y-4">
        <Card>
          <CardBody className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-surface-500 font-medium">Payment Date</dt><dd className="text-sm font-semibold">{fmtDate(payment.paymentDate)}</dd></div>
            <div><dt className="text-xs text-surface-500 font-medium">Billing Party</dt><dd className="text-sm font-semibold">{payment.partyName}</dd></div>
            <div><dt className="text-xs text-surface-500 font-medium">Type</dt><dd className="text-sm">{payment.type}</dd></div>
            <div><dt className="text-xs text-surface-500 font-medium">Amount Paid</dt><dd className="text-xl font-bold text-green-700">{fmtMoney(payment.paidAmount)}</dd></div>
            <div><dt className="text-xs text-surface-500 font-medium">Invoice Ref</dt><dd className="text-sm text-bhoomi-700 font-medium">{payment.invoiceRef || '—'}</dd></div>
            <div><dt className="text-xs text-surface-500 font-medium">Invoice Amount</dt><dd className="text-sm">{fmtMoney(payment.invoiceAmount)}</dd></div>
            <div><dt className="text-xs text-surface-500 font-medium">Paid By</dt><dd className="text-sm">{payment.paidBy || '—'}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-surface-500 font-medium">Notes</dt><dd className="text-sm">{payment.notes || '—'}</dd></div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
