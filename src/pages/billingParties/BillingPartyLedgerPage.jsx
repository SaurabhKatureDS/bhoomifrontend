import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { getBillingParty, getBillingPartyLedger } from '@/api/billingParties'
import { ROUTES } from '@/utils/constants'
import RecordPaymentModal from '@/pages/payments/RecordPaymentModal'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default function BillingPartyLedgerPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [party, setParty] = useState(null)
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, l] = await Promise.all([
        getBillingParty(id),
        getBillingPartyLedger(id).catch(() => []),
      ])
      setParty(p)
      setLedger(Array.isArray(l) ? l : l?.entries || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  if (loading) return <AppLayout title="Party Ledger"><div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div></AppLayout>

  const bal = Number(party?.outstandingBalance) || 0

  return (
    <AppLayout
      title={party?.name || 'Billing Party'}
      breadcrumbs={['Finance', 'Billing Parties', party?.name || id]}
      actions={
        <Button onClick={() => setShowPayment(true)}>
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-6 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-xs font-semibold text-surface-500">Outstanding</div>
            <div className={`text-xl font-bold mt-1 ${bal > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {fmtMoney(Math.abs(bal))}{bal < 0 ? ' CR' : ''}
            </div>
            <div className="text-xs text-surface-400 mt-0.5">{party?.balanceLabel || ''}</div>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-xs font-semibold text-surface-500">Invoiced</div>
            <div className="text-xl font-bold text-surface-900 mt-1">{fmtMoney(party?.invoicedTillDate)}</div>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-xs font-semibold text-surface-500">Commission Earned</div>
            <div className="text-xl font-bold text-surface-900 mt-1">{fmtMoney(party?.commissionEarned)}</div>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-xs font-semibold text-surface-500">Cash Paid</div>
            <div className="text-xl font-bold text-green-700 mt-1">{fmtMoney(party?.cashPaidTillDate)}</div>
          </div>
        </div>

        {/* Ledger */}
        <Card>
          <div className="px-4 py-3 border-b border-surface-200">
            <h3 className="text-sm font-semibold text-surface-800">Transaction Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  {['Date', 'Type', 'Reference', 'Debit (Invoice)', 'Credit (Payment)', 'Balance'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-surface-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {ledger.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-surface-400">No ledger entries found.</td></tr>
                ) : ledger.map((entry, i) => (
                  <tr key={i} className="hover:bg-surface-50">
                    <td className="px-3 py-2 text-surface-600">{fmtDate(entry.date)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={entry.entryType === 'INVOICE' ? 'blue' : 'green'} size="xs">
                        {entry.entryType === 'INVOICE' ? 'Invoice' : 'Payment'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-bhoomi-700 font-medium">{entry.reference || '—'}</td>
                    <td className="px-3 py-2 text-red-600 font-medium">{entry.debit ? fmtMoney(entry.debit) : '—'}</td>
                    <td className="px-3 py-2 text-green-700 font-medium">{entry.credit ? fmtMoney(entry.credit) : '—'}</td>
                    <td className={`px-3 py-2 font-bold ${Number(entry.runningBalance) > 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {fmtMoney(Math.abs(entry.runningBalance))}{Number(entry.runningBalance) < 0 ? ' CR' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {showPayment && (
        <RecordPaymentModal
          prefillPartyId={id}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); load() }}
        />
      )}
    </AppLayout>
  )
}
