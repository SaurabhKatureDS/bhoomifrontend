import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getUnbilledStockSummary, getUnbilledStockBySku } from '@/api/unbilledStock'
import { ROUTES } from '@/utils/constants'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default function UnbilledItemsPage() {
  const navigate = useNavigate()
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
    
    // Calculate total cases and amount for the selected SKU
    const totalDrillCases = rows.reduce((sum, r) => sum + (Number(r.cases) || 0), 0)
    const totalDrillAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    
    // Pull product details from the first record to show in summary footer row
    const firstRow = rows[0] || {}
    const pName = firstRow.productName || ''

    return (
      <AppLayout
        title="Unbilled Inventory Product Wise Challan Wise Summary"
        breadcrumbs={['Inventory', 'Unbilled Items', drillSku]}
        actions={
          <Button variant="outline" size="sm" onClick={() => { setDrillSku(null); setDrillData(null) }} className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      >
        <div className="px-4 py-6 md:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-surface-900">Drilldown details for {drillSku}</h2>
              <p className="text-sm text-surface-500 mt-1">Showing delivery challan details contributing to this SKU's unbilled stock. Click on any row to view that delivery challan.</p>
            </div>
          </div>

          <Card className="shadow-md border-surface-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    {['DC #', 'Party', 'Date', 'SKU', 'Product', 'MRP', 'GST%', 'Net Rate (incl)', 'Cases', 'Amount'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-bold text-surface-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {drillLoading ? (
                    <tr><td colSpan={10} className="py-12 text-center"><Spinner className="h-6 w-6 inline" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-surface-500">No data found for this SKU.</td></tr>
                  ) : (
                    <>
                      {rows.map((r, i) => (
                        <tr 
                          key={i} 
                          className="hover:bg-surface-50/80 cursor-pointer transition-colors duration-150"
                          onClick={() => r.challanId && navigate(ROUTES.CHALLAN_VIEW.replace(':id', r.challanId))}
                        >
                          <td className="px-3 py-3.5 text-bhoomi-700 font-semibold hover:underline whitespace-nowrap">{r.challanNumber || `DC #${r.challanId}`}</td>
                          <td className="px-3 py-3.5 text-surface-900 font-medium">{r.customerName || r.partyName || '—'}</td>
                          <td className="px-3 py-3.5 text-surface-600 whitespace-nowrap">{fmtDate(r.challanDate || r.date)}</td>
                          <td className="px-3 py-3.5 text-surface-500 font-medium">{r.sku}</td>
                          <td className="px-3 py-3.5 text-surface-800 font-medium">{r.productName}</td>
                          <td className="px-3 py-3.5 text-surface-700 whitespace-nowrap">{r.mrp ? `₹${r.mrp}` : '—'}</td>
                          <td className="px-3 py-3.5 text-surface-600">{r.gstRate ? `${r.gstRate}%` : '—'}</td>
                          <td className="px-3 py-3.5 text-surface-700 font-semibold whitespace-nowrap">{r.netRate ? `₹${Number(r.netRate).toFixed(3)}` : '—'}</td>
                          <td className="px-3 py-3.5 font-bold text-surface-900">{r.cases}</td>
                          <td className="px-3 py-3.5 font-bold text-surface-900 whitespace-nowrap">{fmtMoney(r.amount)}</td>
                        </tr>
                      ))}
                      {/* Summary row exactly matching the Excel style */}
                      <tr className="border-t-2 border-surface-300 bg-surface-50/70 font-semibold">
                        <td className="px-3 py-4 text-surface-400">—</td>
                        <td className="px-3 py-4 text-surface-400">—</td>
                        <td className="px-3 py-4 text-surface-400">—</td>
                        <td className="px-3 py-4 text-surface-900 font-bold">{drillSku}</td>
                        <td className="px-3 py-4 text-surface-800 font-medium">{pName}</td>
                        <td className="px-3 py-4 text-surface-400">—</td>
                        <td className="px-3 py-4 text-surface-400">—</td>
                        <td className="px-3 py-4 text-surface-400">—</td>
                        <td className="px-3 py-4 font-bold text-surface-900 text-base">{totalDrillCases}</td>
                        <td className="px-3 py-4 font-bold text-surface-900 text-base whitespace-nowrap">{fmtMoney(totalDrillAmount)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout 
      title="Unbilled Items" 
      breadcrumbs={['Inventory', 'Unbilled Items']}
      actions={
        <Button onClick={() => navigate(ROUTES.UNBILLED_TRANSACTION_NEW)} className="flex items-center gap-1.5 shadow-sm hover:shadow transition-all">
          <Plus className="h-4 w-4" /> New Transaction
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-8 max-w-6xl">
        {/* GST Summary */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-surface-900">Unbilled Inventory GST Summary</h3>
            <p className="text-xs text-surface-500 mt-0.5">Aggregated unbilled inventory values bucketed by GST slab.</p>
          </div>
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 border-surface-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-surface-600 uppercase tracking-wider">GST</th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-surface-600 uppercase tracking-wider">Cases</th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-surface-600 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {gstSummary.length === 0 ? (
                    <tr><td colSpan={3} className="py-10 text-center text-surface-500 font-medium">No unbilled stock.</td></tr>
                  ) : gstSummary.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-50/80 transition-colors duration-150">
                      <td className="px-5 py-3.5 font-bold text-surface-900">GST {row.gstRate}%</td>
                      <td className="px-5 py-3.5 text-right font-medium text-surface-800">{row.totalCases}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-surface-900">{fmtMoney(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {gstSummary.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-surface-300 bg-surface-100/50 font-extrabold text-sm">
                      <td className="px-5 py-4 text-surface-900">Total</td>
                      <td className="px-5 py-4 text-right text-surface-900">{gstSummary.reduce((s, r) => s + (r.totalCases || 0), 0)}</td>
                      <td className="px-5 py-4 text-right text-surface-900">{fmtMoney(gstSummary.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </section>

        {/* Product-wise Summary */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-surface-900">Unbilled Inventory Product Wise Summary</h3>
            <p className="text-xs text-surface-500 mt-0.5">Available unbilled stock grouped by SKU. Click any row to view challan details.</p>
          </div>
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 border-surface-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-surface-600 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-surface-600 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-surface-600 uppercase tracking-wider">MRP</th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-surface-600 uppercase tracking-wider">GST%</th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-surface-600 uppercase tracking-wider">Cases</th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-surface-600 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {productSummary.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-surface-500 font-medium">No product data available.</td></tr>
                  ) : productSummary.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-50 cursor-pointer transition-colors duration-150" onClick={() => handleSkuClick(row.sku)}>
                      <td className="px-4 py-4 text-bhoomi-700 font-bold hover:underline">{row.sku}</td>
                      <td className="px-4 py-4 text-surface-900 font-medium">{row.productName}</td>
                      <td className="px-4 py-4 text-right text-surface-700 font-medium">{row.mrp ? `₹${row.mrp}` : '—'}</td>
                      <td className="px-4 py-4 text-right text-surface-600 font-medium">{row.gstRate ? `${row.gstRate}%` : '—'}</td>
                      <td className="px-4 py-4 text-right font-bold text-surface-900">{row.totalCases}</td>
                      <td className="px-4 py-4 text-right font-bold text-surface-900">{fmtMoney(row.totalAmount)}</td>
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
