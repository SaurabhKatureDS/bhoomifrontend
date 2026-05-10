import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getUnbilledStockSummary, getUnbilledStockBySku } from '@/api/unbilledStock'
import { ROUTES } from '@/utils/constants'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default function UnbilledItemsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [drillSku, setDrillSku] = useState(null)
  const [drillData, setDrillData] = useState(null)
  const [drillLoading, setDrillLoading] = useState(false)

  useEffect(() => {
    getUnbilledStockSummary().then(setSummary).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSkuClick = async (sku) => {
    setDrillSku(sku)
    setDrillLoading(true)
    try { setDrillData(await getUnbilledStockBySku(sku)) }
    catch (e) { console.error(e) }
    finally { setDrillLoading(false) }
  }

  const gstSummary = summary?.gstSummary
    ? Array.isArray(summary.gstSummary)
      ? summary.gstSummary
      : Object.entries(summary.gstSummary).map(([gstRate, totalAmount]) => ({ gstRate, totalAmount }))
    : []
  const productSummary = (Array.isArray(summary?.productWise) ? summary.productWise : Array.isArray(summary?.productSummary) ? summary.productSummary : [])
    .map(r => ({ ...r, totalCases: r.totalCases ?? r.cases, totalAmount: r.totalAmount ?? r.amount }))

  if (loading) return (
    <AppLayout title="Unbilled Items">
      <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
    </AppLayout>
  )

  if (drillSku) {
    const rows = drillData?.items || drillData || []
    return (
      <AppLayout
        title={`Unbilled Stock — ${drillSku}`}
        breadcrumbs={['Inventory', 'Unbilled Items', drillSku]}
        actions={
          <Button variant="outline" size="sm" onClick={() => { setDrillSku(null); setDrillData(null) }}>
            ← Back
          </Button>
        }
      >
        <div className="px-4 py-6 md:px-8">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    {['DC #', 'Party / Customer', 'Date', 'SKU', 'Product', 'MRP', 'GST%', 'Net Rate', 'Cases', 'Amount'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {drillLoading ? (
                    <tr><td colSpan={10} className="py-12 text-center"><Spinner className="h-6 w-6 inline" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-surface-500">No data.</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i} className="hover:bg-surface-50">
                      <td className="px-3 py-2 text-bhoomi-700 font-medium">{r.challanNumber}</td>
                      <td className="px-3 py-2 text-surface-800">{r.customerName || r.partyName}</td>
                      <td className="px-3 py-2 text-surface-600">{fmtDate(r.challanDate)}</td>
                      <td className="px-3 py-2 text-surface-500">{r.sku}</td>
                      <td className="px-3 py-2 text-surface-800">{r.productName}</td>
                      <td className="px-3 py-2 text-surface-700">{r.mrp ? `₹${r.mrp}` : '—'}</td>
                      <td className="px-3 py-2 text-surface-600">{r.gstRate ? `${r.gstRate}%` : '—'}</td>
                      <td className="px-3 py-2 text-surface-700">{r.netRate ? `₹${r.netRate}` : '—'}</td>
                      <td className="px-3 py-2 font-medium text-surface-900">{r.cases}</td>
                      <td className="px-3 py-2 font-medium text-surface-900">{fmtMoney(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Unbilled Items" breadcrumbs={['Inventory', 'Unbilled Items']}>
      <div className="px-4 py-6 md:px-8 space-y-8">
        {/* GST Summary */}
        <section>
          <h3 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-3">Unbilled Inventory — GST Summary</h3>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase">GST %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 uppercase">Cases</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {gstSummary.length === 0 ? (
                    <tr><td colSpan={3} className="py-8 text-center text-surface-500">No unbilled stock.</td></tr>
                  ) : gstSummary.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium text-surface-800">{row.gstRate}%</td>
                      <td className="px-4 py-3 text-right text-surface-700">{row.totalCases}</td>
                      <td className="px-4 py-3 text-right font-semibold text-surface-900">{fmtMoney(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {gstSummary.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-surface-300 bg-surface-50 font-bold">
                      <td className="px-4 py-3 text-surface-700">Total</td>
                      <td className="px-4 py-3 text-right text-surface-900">{gstSummary.reduce((s, r) => s + (r.totalCases || 0), 0)}</td>
                      <td className="px-4 py-3 text-right text-surface-900">{fmtMoney(gstSummary.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </section>

        {/* Product-wise Summary */}
        <section>
          <h3 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-3">Product Wise Summary</h3>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">SKU</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Product</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-surface-600 uppercase">MRP</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-surface-600 uppercase">GST%</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-surface-600 uppercase">Cases</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-surface-600 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {productSummary.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-surface-500">No data.</td></tr>
                  ) : productSummary.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-50 cursor-pointer" onClick={() => handleSkuClick(row.sku)}>
                      <td className="px-3 py-3 text-bhoomi-700 font-medium hover:underline">{row.sku}</td>
                      <td className="px-3 py-3 text-surface-800">{row.productName}</td>
                      <td className="px-3 py-3 text-right text-surface-700">{row.mrp ? `₹${row.mrp}` : '—'}</td>
                      <td className="px-3 py-3 text-right text-surface-600">{row.gstRate ? `${row.gstRate}%` : '—'}</td>
                      <td className="px-3 py-3 text-right font-medium text-surface-900">{row.totalCases}</td>
                      <td className="px-3 py-3 text-right font-semibold text-surface-900">{fmtMoney(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </AppLayout>
  )
}
