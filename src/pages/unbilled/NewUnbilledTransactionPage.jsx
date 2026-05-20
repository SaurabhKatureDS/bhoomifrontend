import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Save } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { createUnbilledTransaction } from '@/api/unbilledTransactions'
import { listBillingParties } from '@/api/billingParties'
import { listLocations } from '@/api/locations'
import { getUnbilledStockBySku } from '@/api/unbilledStock'
import { apiGet } from '@/api/client'
import { cn } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

const emptyLine = () => ({
  _key: Math.random().toString(36).slice(2),
  itemId: '',
  sku: '',
  productName: '',
  packing: '',
  mrp: '',
  gstRate: '',
  cases: '',
  invoiceRate: '',
  commissionPct: '',
  // computed
  totalUnits: 0,
  invoiceValue: 0,
  commissionAmount: 0,
  cashToBePaid: 0,
  availableCases: null,
})

function calcLine(line) {
  const cases = Number(line.cases) || 0
  const packing = Number(line.packing) || 1
  const totalUnits = cases * packing
  const invoiceValue = totalUnits * (Number(line.invoiceRate) || 0)
  const commissionAmount = invoiceValue * (Number(line.commissionPct) || 0) / 100
  const cashToBePaid = invoiceValue - commissionAmount
  return { ...line, totalUnits, invoiceValue, commissionAmount, cashToBePaid }
}

export default function NewUnbilledTransactionPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [parties, setParties] = useState([])
  const [locations, setLocations] = useState([])
  const [stockList, setStockList] = useState([])
  const [partySearch, setPartySearch] = useState('')
  const [partyDropdown, setPartyDropdown] = useState(false)
  const [selectedParty, setSelectedParty] = useState(null)
  const [locationId, setLocationId] = useState('')
  const [zohoRef, setZohoRef] = useState('')
  const [zohoValue, setZohoValue] = useState('')
  const [lines, setLines] = useState([emptyLine()])

  useEffect(() => {
    Promise.all([
      listBillingParties({ size: 200 }),
      listLocations(),
      apiGet('/api/v1/unbilled-stock'),
    ]).then(([pts, locs, stks]) => {
      setParties(pts?.content || pts || [])
      setLocations(Array.isArray(locs) ? locs : locs?.content || [])
      setStockList(stks || [])
    })
  }, [])

  const filteredParties = parties.filter(p => !partySearch || p.name?.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 20)

  const handleStockSelect = (idx, stockId) => {
    const stock = stockList.find(s => String(s.id) === String(stockId))
    if (!stock) return

    const availableCases = (stock.casesIn || 0) - (stock.casesBilled || 0)

    setLines(ls => ls.map((l, i) => i === idx ? calcLine({
      ...l,
      itemId: stock.itemId,
      unbilledStockId: stock.id,
      sourceChallanId: stock.sourceChallanId,
      sku: stock.sku,
      productName: stock.productName,
      packing: stock.packing || '',
      mrp: stock.mrp || '',
      gstRate: stock.gstPercent || '',
      cases: availableCases,
      availableCases,
      invoiceRate: stock.sourceRate || '',
    }) : l))
  }

  const updateLine = (idx, field, value) => {
    setLines(ls => ls.map((l, i) => i === idx ? calcLine({ ...l, [field]: value }) : l))
  }

  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const removeLine = (idx) => setLines(ls => ls.filter((_, i) => i !== idx))

  const challanValue = lines.reduce((s, l) => s + (l.invoiceValue || 0), 0)
  const totalCommission = lines.reduce((s, l) => s + (l.commissionAmount || 0), 0)
  const totalCash = lines.reduce((s, l) => s + (l.cashToBePaid || 0), 0)
  const diff = (Number(zohoValue) || 0) - challanValue
  const matched = Math.abs(diff) < 1

  const handleSave = async () => {
    if (!selectedParty) { alert('Select a billing party.'); return }
    setSaving(true)
    try {
      const tx = await createUnbilledTransaction({
        billingPartyId: selectedParty.id,
        locationId: locationId || undefined,
        zohoInvoiceRef: zohoRef || undefined,
        zohoInvoiceValue: zohoValue ? Number(zohoValue) : undefined,
        challanInvoiceValue: challanValue,
        items: lines.filter(l => l.itemId).map(l => ({
          itemId: l.itemId,
          unbilledStockId: l.unbilledStockId,
          sourceChallanId: l.sourceChallanId,
          productName: l.productName,
          sku: l.sku,
          packing: l.packing,
          mrp: l.mrp ? Number(l.mrp) : undefined,
          gstPercent: l.gstRate ? Number(l.gstRate) : undefined,
          cases: Number(l.cases) || 0,
          invoiceRate: Number(l.invoiceRate) || 0,
          commissionPercent: Number(l.commissionPct) || 0,
          lineAmount: l.invoiceValue || 0,
        })),
      })
      navigate(ROUTES.UNBILLED_TRANSACTION_VIEW.replace(':id', tx.id))
    } catch (e) {
      alert(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="New Unbilled Transaction" breadcrumbs={['Finance', 'Unbilled Transactions', 'New']}>
      <div className="px-4 py-6 md:px-8 space-y-6 max-w-6xl">
        {/* Header */}
        <Card>
          <CardBody className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Billing Party */}
            <div className="relative md:col-span-2">
              <label className="block text-xs font-semibold text-surface-600 mb-1">Billing Party *</label>
              <input
                value={partySearch}
                onChange={e => { setPartySearch(e.target.value); setPartyDropdown(true) }}
                onFocus={() => setPartyDropdown(true)}
                placeholder="Search billing party..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
              />
              {partyDropdown && filteredParties.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                  {filteredParties.map(p => (
                    <li key={p.id} className="px-3 py-2 hover:bg-bhoomi-50 cursor-pointer"
                      onMouseDown={e => { e.preventDefault(); setSelectedParty(p); setPartySearch(p.name); setPartyDropdown(false) }}>
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Location (Zoho)</label>
              <select value={locationId} onChange={e => setLocationId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500">
                <option value="">Select</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div />

            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Zoho Invoice Ref #</label>
              <input value={zohoRef} onChange={e => setZohoRef(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Zoho Invoice Value</label>
              <input type="number" value={zohoValue} onChange={e => setZohoValue(e.target.value)} step={0.01}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Challan Invoice Value</label>
              <div className="px-3 py-2 text-sm rounded-lg border border-surface-200 bg-surface-50 font-medium text-surface-800">
                ₹{challanValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Difference</label>
              <div className={cn('px-3 py-2 text-sm rounded-lg border font-semibold',
                matched ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700')}>
                {zohoValue ? (matched ? '✓ Matched' : `₹${diff.toFixed(2)} Not Matching`) : '—'}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Line items */}
        <Card>
          <div className="px-4 py-3 border-b border-surface-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-surface-800">Products</h3>
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Add Row</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  {['Product Source (Unbilled Stock Line)', 'SKU', 'MRP', 'GST%', 'Pack', 'Cases', 'Avail.', 'Units', 'Inv. Rate', 'Inv. Value', 'Comm%', 'Comm Amt', 'Cash Due', ''].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-surface-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {lines.map((line, idx) => (
                  <tr key={line._key}>
                    <td className="px-2 py-2">
                      <select value={line.unbilledStockId || ''} onChange={e => handleStockSelect(idx, e.target.value)}
                        className="w-72 px-2 py-1.5 text-xs rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500">
                        <option value="">Select Unbilled Stock Line</option>
                        {stockList.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.productName} ({s.sku}) · Challan {s.sourceChallanNumber} · Avail: {(s.casesIn || 0) - (s.casesBilled || 0)} cases
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-surface-500 whitespace-nowrap">{line.sku || '—'}</td>
                    <td className="px-2 py-2 text-surface-600">{line.mrp ? `₹${line.mrp}` : '—'}</td>
                    <td className="px-2 py-2 text-surface-600">{line.gstRate ? `${line.gstRate}%` : '—'}</td>
                    <td className="px-2 py-2 text-surface-600">{line.packing || '—'}</td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} value={line.cases} onChange={e => updateLine(idx, 'cases', e.target.value)}
                        className="w-16 px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500" />
                    </td>
                    <td className={cn('px-2 py-2 text-xs whitespace-nowrap',
                      line.availableCases != null && Number(line.cases) > line.availableCases ? 'text-red-600 font-semibold' : 'text-surface-500')}>
                      {line.availableCases != null ? line.availableCases : '—'}
                    </td>
                    <td className="px-2 py-2 text-surface-700 font-medium">{line.totalUnits || 0}</td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} step={0.01} value={line.invoiceRate} onChange={e => updateLine(idx, 'invoiceRate', e.target.value)}
                        className="w-24 px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500" />
                    </td>
                    <td className="px-2 py-2 font-medium text-surface-900 whitespace-nowrap">
                      {line.invoiceValue ? `₹${line.invoiceValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} max={100} step={0.1} value={line.commissionPct} onChange={e => updateLine(idx, 'commissionPct', e.target.value)}
                        className="w-16 px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500" />
                    </td>
                    <td className="px-2 py-2 text-surface-700 whitespace-nowrap">
                      {line.commissionAmount ? `₹${line.commissionAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-2 py-2 font-semibold text-surface-900 whitespace-nowrap">
                      {line.cashToBePaid ? `₹${line.cashToBePaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => removeLine(idx)} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-300 bg-surface-50 font-semibold">
                  <td colSpan={9} className="px-2 py-3 text-right text-surface-700">Totals</td>
                  <td className="px-2 py-3 text-surface-900">₹{challanValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  <td />
                  <td className="px-2 py-3 text-surface-700">₹{totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  <td className="px-2 py-3 text-surface-900">₹{totalCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(ROUTES.UNBILLED_TRANSACTIONS)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Save Transaction
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
