import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getCashCustomerLedger } from '@/api/customers'

const fmtMoney = (v) =>
  v == null ? '—' : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(v))}`

const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

function downloadLedgerCSV(data) {
  const headers = ['Date', 'Category', 'Transaction', 'Person', 'DC#', 'Description', 'Dr Amount', 'Cr Amount']
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    `Customer: ${data.customerName} | City: ${data.city || ''} | Cluster: ${data.clusterName || ''} | Phone: ${data.phone || ''}`,
    '',
    headers.join(','),
    ...(data.entries || []).map((e) =>
      [
        fmtDate(e.date),
        e.category,
        e.transaction,
        e.person || '',
        e.challanNumber || '',
        e.description || '',
        e.side === 'DR' ? Number(e.amount) : '',
        e.side === 'CR' ? Number(e.amount) : '',
      ]
        .map(escape)
        .join(',')
    ),
    '',
    escape(`Total Sales`) + `,,,,,,,${Number(data.totalSales || 0)}`,
    escape(`Total Collected`) + `,,,,,,,${Number(data.totalCollected || 0)}`,
    escape(`Outstanding`) + `,,,,,,,${Number(data.outstanding || 0)}`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ledger-${data.customerName?.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function LabelBadge({ label }) {
  if (!label) return null
  if (label === 'Receivable') return <Badge variant="amber">{label}</Badge>
  if (label === 'Excess cash paid') return <Badge variant="green">{label}</Badge>
  return <Badge variant="default">{label}</Badge>
}

export default function CustomerProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getCashCustomerLedger(id)
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load ledger'))
      .finally(() => setLoading(false))
  }, [id])

  const outstanding = data ? Number(data.outstanding || 0) : 0

  return (
    <AppLayout
      title={data ? data.customerName : 'Customer Ledger'}
      subtitle="Bhoomi Enterprises · Customers"
      breadcrumbs={['Bhoomi Enterprises', 'Customers', data?.customerName ?? '...']}
    >
      <div className="px-4 py-6 md:px-8 space-y-5">
        {/* Back + Download */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-surface-600 hover:text-surface-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </button>
          {data && (
            <Button variant="outline" onClick={() => downloadLedgerCSV(data)} className="gap-1.5">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Customer header card */}
            <Card className="px-5 py-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-surface-900">{data.customerName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-600">
                    {data.city && <span>{data.city}</span>}
                    {data.clusterName && (
                      <span className="flex items-center gap-1">
                        <Badge variant="default">{data.clusterName}</Badge>
                      </span>
                    )}
                    {data.phone && <span>{data.phone}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 mt-2 sm:mt-0">
                  <div className="text-sm text-surface-500">Outstanding</div>
                  <div className={`text-xl font-bold tabular-nums ${outstanding > 0 ? 'text-red-600' : outstanding < 0 ? 'text-green-600' : 'text-surface-500'}`}>
                    {outstanding < 0 ? `(${fmtMoney(Math.abs(outstanding))})` : fmtMoney(outstanding)}
                  </div>
                  {data.label && (
                    <div className="mt-0.5">
                      <LabelBadge label={data.label} />
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Ledger table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-surface-200">
                  <thead className="bg-surface-50">
                    <tr>
                      {['Date', 'Category', 'Transaction', 'Person', 'DC#', 'Description', 'Dr Amount (₹)', 'Cr Amount (₹)'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 bg-white">
                    {(data.entries || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-sm text-surface-500">
                          No ledger entries found.
                        </td>
                      </tr>
                    ) : (
                      data.entries.map((e, i) => (
                        <tr key={i} className="hover:bg-surface-50/50">
                          <td className="px-4 py-2.5 text-sm text-surface-600 whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="px-4 py-2.5 text-sm text-surface-700">{e.category}</td>
                          <td className="px-4 py-2.5 text-sm text-surface-800">{e.transaction}</td>
                          <td className="px-4 py-2.5 text-sm text-surface-600">{e.person || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-surface-600">{e.challanNumber || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-surface-500 italic">{e.description || '—'}</td>
                          <td className="px-4 py-2.5 text-sm tabular-nums text-right text-red-600 font-medium">
                            {e.side === 'DR' ? fmtMoney(e.amount) : ''}
                          </td>
                          <td className="px-4 py-2.5 text-sm tabular-nums text-right text-green-600 font-medium">
                            {e.side === 'CR' ? fmtMoney(e.amount) : ''}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Summary footer */}
                  <tfoot className="bg-surface-50 border-t-2 border-surface-200">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-surface-700 text-right">Total Sales</td>
                      <td className="px-4 py-3 text-sm font-bold tabular-nums text-right text-red-600">{fmtMoney(data.totalSales)}</td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-surface-700 text-right">Total Collected</td>
                      <td />
                      <td className="px-4 py-3 text-sm font-bold tabular-nums text-right text-green-600">{fmtMoney(data.totalCollected)}</td>
                    </tr>
                    <tr className="border-t border-surface-200">
                      <td colSpan={6} className="px-4 py-3 text-sm font-bold text-surface-800 text-right">
                        Closing Balance
                        {data.label && (
                          <span className="ml-2 align-middle">
                            <LabelBadge label={data.label} />
                          </span>
                        )}
                      </td>
                      <td
                        colSpan={2}
                        className={`px-4 py-3 text-base font-bold tabular-nums text-right ${
                          outstanding > 0 ? 'text-red-600' : outstanding < 0 ? 'text-green-600' : 'text-surface-500'
                        }`}
                      >
                        {outstanding < 0 ? `(${fmtMoney(Math.abs(outstanding))})` : fmtMoney(outstanding)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}
