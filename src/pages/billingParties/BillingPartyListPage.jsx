import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Edit2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { listBillingParties, updateReminderDate } from '@/api/billingParties'
import { ROUTES } from '@/utils/constants'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default function BillingPartyListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [parties, setParties] = useState([])
  const [search, setSearch] = useState('')
  const [editingReminder, setEditingReminder] = useState(null)
  const [reminderValue, setReminderValue] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await listBillingParties({ size: 500 })
      setParties(r?.content || r || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = parties.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()))

  const totalOutstanding = filtered.reduce((s, p) => s + (Number(p.outstandingBalance) || 0), 0)
  const totalInvoiced = filtered.reduce((s, p) => s + (Number(p.invoicedTillDate) || 0), 0)
  const totalCommission = filtered.reduce((s, p) => s + (Number(p.commissionEarned) || 0), 0)
  const totalCashPaid = filtered.reduce((s, p) => s + (Number(p.cashPaidTillDate) || 0), 0)

  const saveReminder = async (partyId) => {
    try {
      await updateReminderDate(partyId, reminderValue || null)
      setEditingReminder(null)
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <AppLayout title="Billing Parties" breadcrumbs={['Finance', 'Billing Parties']}>
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="text-xs font-semibold text-surface-500">Outstanding</div>
            <div className="text-xl font-bold text-red-600 mt-1">{fmtMoney(totalOutstanding)}</div>
          </div>
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="text-xs font-semibold text-surface-500">Invoiced</div>
            <div className="text-xl font-bold text-surface-900 mt-1">{fmtMoney(totalInvoiced)}</div>
          </div>
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="text-xs font-semibold text-surface-500">Commission</div>
            <div className="text-xl font-bold text-surface-900 mt-1">{fmtMoney(totalCommission)}</div>
          </div>
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="text-xs font-semibold text-surface-500">Cash Paid</div>
            <div className="text-xl font-bold text-green-700 mt-1">{fmtMoney(totalCashPaid)}</div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardBody className="flex gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search party..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-surface-300 bg-surface-50 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          {loading ? (
            <CardBody className="flex justify-center py-16"><Spinner className="h-8 w-8" /></CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    {['Billing Party', 'O/S Balance', 'Label', 'Invoiced', 'Commission', 'Cash Paid', 'Last Bill', 'Last Cash', 'Reminder'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-surface-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.map(p => {
                    const bal = Number(p.outstandingBalance) || 0
                    return (
                      <tr key={p.id} className="hover:bg-surface-50">
                        <td className="px-3 py-3 font-medium text-bhoomi-700 cursor-pointer hover:underline"
                          onClick={() => navigate(ROUTES.BILLING_PARTY_LEDGER.replace(':id', p.id))}>
                          {p.name}
                        </td>
                        <td className={`px-3 py-3 font-bold ${bal > 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {fmtMoney(Math.abs(bal))}{bal < 0 ? ' CR' : ''}
                        </td>
                        <td className="px-3 py-3 text-xs text-surface-500">{p.balanceLabel || '—'}</td>
                        <td className="px-3 py-3 text-surface-700">{fmtMoney(p.invoicedTillDate)}</td>
                        <td className="px-3 py-3 text-surface-700">{fmtMoney(p.commissionEarned)}</td>
                        <td className="px-3 py-3 text-green-700 font-medium">{fmtMoney(p.cashPaidTillDate)}</td>
                        <td className="px-3 py-3 text-surface-500">{fmtDate(p.lastBillDate)}</td>
                        <td className="px-3 py-3 text-surface-500">{fmtDate(p.lastCashPaid)}</td>
                        <td className="px-3 py-3">
                          {editingReminder === p.id ? (
                            <div className="flex gap-1 items-center">
                              <input type="date" value={reminderValue} onChange={e => setReminderValue(e.target.value)}
                                className="px-2 py-1 text-xs rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500" />
                              <button onClick={() => saveReminder(p.id)} className="px-2 py-1 text-xs bg-bhoomi-600 text-white rounded hover:bg-bhoomi-700">✓</button>
                              <button onClick={() => setEditingReminder(null)} className="px-2 py-1 text-xs border border-surface-300 rounded hover:bg-surface-100">✕</button>
                            </div>
                          ) : (
                            <div className="flex gap-1 items-center group">
                              <span className="text-xs text-surface-500">{fmtDate(p.reminderDate)}</span>
                              <button onClick={() => { setEditingReminder(p.id); setReminderValue(p.reminderDate || '') }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-200 text-surface-400">
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-300 bg-surface-50 font-bold">
                    <td className="px-3 py-3 text-surface-800">{filtered.length} parties</td>
                    <td className={`px-3 py-3 ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-700'}`}>{fmtMoney(Math.abs(totalOutstanding))}</td>
                    <td />
                    <td className="px-3 py-3 text-surface-900">{fmtMoney(totalInvoiced)}</td>
                    <td className="px-3 py-3 text-surface-900">{fmtMoney(totalCommission)}</td>
                    <td className="px-3 py-3 text-green-700">{fmtMoney(totalCashPaid)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
