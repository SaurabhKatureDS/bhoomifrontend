import { useState, useEffect } from 'react'
import { Download, ChevronLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getBilledItemsSummary, getBilledItemsReconciliation } from '@/api/billedItems'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default function BilledItemsPage() {
  const [summary, setSummary] = useState(null)
  const [recon, setRecon] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('summary') // 'summary' | 'recon'

  useEffect(() => {
    Promise.all([
      getBilledItemsSummary().catch(() => null),
      getBilledItemsReconciliation().catch(() => []),
    ]).then(([s, r]) => {
      setSummary(s)
      setRecon(Array.isArray(r) ? r : r?.content || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <AppLayout title="Billed Items"><div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div></AppLayout>

  return (
    <AppLayout
      title="Billed Items"
      breadcrumbs={['Finance', 'Billed Items']}
    >
      <div className="px-4 py-6 md:px-8 space-y-6 max-w-7xl">
        <div className="flex gap-2">
          <Button variant={view === 'summary' ? 'primary' : 'outline'} size="sm" onClick={() => setView('summary')}>Summary</Button>
          <Button variant={view === 'recon' ? 'primary' : 'outline'} size="sm" onClick={() => setView('recon')}>Reconciliation</Button>
        </div>

        {view === 'summary' && (
          <div className="space-y-6">
            {/* GST Summary */}
            <Card>
              <div className="px-4 py-3 border-b border-surface-200"><h3 className="text-sm font-semibold text-surface-800">GST Summary</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-50 border-b border-surface-100">
                    <tr>
                      {['GST %', 'Cases', 'Invoice Amount', 'Commission', 'Avg Comm %'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-surface-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {(Array.isArray(summary?.gstSummary)
                        ? summary.gstSummary
                        : Object.entries(summary?.gstSummary || {}).map(([gstRate, totalAmount]) => ({ gstRate, totalAmount }))
                      ).map((row, i) => (
                      <tr key={i} className="hover:bg-surface-50">
                        <td className="px-3 py-2 font-medium text-surface-900">{row.gstRate}%</td>
                        <td className="px-3 py-2 text-surface-700">{row.totalCases ?? '—'}</td>
                        <td className="px-3 py-2 text-surface-900">{fmtMoney(row.invoiceAmount ?? row.totalAmount)}</td>
                        <td className="px-3 py-2 text-surface-700">{fmtMoney(row.commissionAmount)}</td>
                        <td className="px-3 py-2 text-surface-500">{row.avgCommissionPct ? `${Number(row.avgCommissionPct).toFixed(1)}%` : '—'}</td>
                      </tr>
                    ))}
                    {(!summary?.gstSummary || Object.keys(summary.gstSummary).length === 0) && (
                      <tr><td colSpan={5} className="py-8 text-center text-surface-400">No data.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Product Wise */}
            <Card>
              <div className="px-4 py-3 border-b border-surface-200"><h3 className="text-sm font-semibold text-surface-800">Product Wise Summary</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-surface-50 border-b border-surface-100">
                    <tr>
                      {['SKU', 'Product', 'MRP', 'GST%', 'Cases', 'Invoice Amount', 'Commission', 'Avg Comm %'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-surface-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {(Array.isArray(summary?.productSummary) ? summary.productSummary : []).map((row, i) => (
                      <tr key={i} className="hover:bg-surface-50">
                        <td className="px-3 py-2 text-surface-500 font-mono text-xs">{row.sku}</td>
                        <td className="px-3 py-2 font-medium text-surface-900">{row.productName}</td>
                        <td className="px-3 py-2 text-surface-700">{row.mrp ? `₹${row.mrp}` : '—'}</td>
                        <td className="px-3 py-2 text-surface-500">{row.gstRate}%</td>
                        <td className="px-3 py-2 font-medium text-surface-900">{row.totalCases}</td>
                        <td className="px-3 py-2 text-surface-900">{fmtMoney(row.invoiceAmount)}</td>
                        <td className="px-3 py-2 text-surface-700">{fmtMoney(row.commissionAmount)}</td>
                        <td className="px-3 py-2 text-surface-500">{row.avgCommissionPct ? `${Number(row.avgCommissionPct).toFixed(1)}%` : '—'}</td>
                      </tr>
                    ))}
                    {(!summary?.productSummary || summary.productSummary.length === 0) && (
                      <tr><td colSpan={8} className="py-8 text-center text-surface-400">No data.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {view === 'recon' && (
          <Card>
            <div className="px-4 py-3 border-b border-surface-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-surface-800">Bill-Wise Product-Wise Reconciliation</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1400px]">
                <thead className="bg-surface-50 border-b border-surface-100">
                  <tr>
                    {['Month', 'Zoho Invoice Ref', 'Date', 'Party', 'Location', 'Product', 'SKU', 'MRP', 'GST%', 'Pack', 'Cases', 'Units', 'Inv Rate', 'Inv Value', 'Comm%', 'Comm Amt', 'Cash Due'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold text-surface-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {recon.length === 0 ? (
                    <tr><td colSpan={17} className="py-12 text-center text-surface-400">No reconciliation data.</td></tr>
                  ) : recon.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-50">
                      <td className="px-2 py-2 text-surface-500 whitespace-nowrap">{row.month || '—'}</td>
                      <td className="px-2 py-2 text-bhoomi-700 font-medium whitespace-nowrap">{row.zohoInvoiceRef || '—'}</td>
                      <td className="px-2 py-2 text-surface-600 whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-2 py-2 text-surface-800 font-medium whitespace-nowrap">{row.partyName}</td>
                      <td className="px-2 py-2 text-surface-500">{row.locationName || '—'}</td>
                      <td className="px-2 py-2 text-surface-800 font-medium whitespace-nowrap">{row.productName}</td>
                      <td className="px-2 py-2 text-surface-500 font-mono">{row.sku}</td>
                      <td className="px-2 py-2 text-surface-600">{row.mrp ? `₹${row.mrp}` : '—'}</td>
                      <td className="px-2 py-2 text-surface-500">{row.gstRate}%</td>
                      <td className="px-2 py-2 text-surface-500">{row.packing}</td>
                      <td className="px-2 py-2 font-medium text-surface-900">{row.cases}</td>
                      <td className="px-2 py-2 text-surface-700">{row.units}</td>
                      <td className="px-2 py-2 text-surface-700">{row.invoiceRate ? `₹${row.invoiceRate}` : '—'}</td>
                      <td className="px-2 py-2 font-medium text-surface-900">{fmtMoney(row.invoiceValue)}</td>
                      <td className="px-2 py-2 text-surface-500">{row.commissionPct ? `${row.commissionPct}%` : '—'}</td>
                      <td className="px-2 py-2 text-surface-700">{fmtMoney(row.commissionAmount)}</td>
                      <td className="px-2 py-2 font-semibold text-surface-900">{fmtMoney(row.cashToBePaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
