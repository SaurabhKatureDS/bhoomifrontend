import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Save, Truck, CheckCircle, Eye, Printer, ArrowLeft, FileText, PenLine } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  createChallan, updateChallan, getChallan,
  markDispatched, markDelivered, deleteChallan,
} from '@/api/challans'
import { listLocations } from '@/api/locations'
import { listRates } from '@/api/rates'
import { apiGet } from '@/api/client'
import { cn } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

const RATE_MODES = [
  { value: 'NET',       label: 'Net Rate' },
  { value: 'DISC_TUR',  label: 'Disc % TUR' },
  { value: 'DISC_MRP',  label: 'Disc % MRP' },
  { value: 'ADHOC',     label: 'Adhoc' },
]

const STATUS_META = {
  SAVED:      { label: 'Saved',      className: 'bg-surface-100 text-surface-600' },
  DISPATCHED: { label: 'Dispatched', className: 'bg-amber-100 text-amber-700' },
  DELIVERED:  { label: 'Delivered',  className: 'bg-blue-100 text-blue-700' },
  PAID:       { label: 'Paid',       className: 'bg-green-100 text-green-700' },
}

const emptyLine = () => ({
  _key: Math.random().toString(36).slice(2),
  itemId: '',
  sku: '',
  productName: '',
  packing: '',
  pkg: '',
  mrp: '',
  rmPercent: '',
  gstRate: '',
  turIncl: '',
  turExcl: '',
  discPctOnTur: '',
  discPctOnMrp: '',
  netRateExcl: '',
  cases: '',
  rateMode: 'NET',
  netRate: '',
  discPct: '',
  adhocAmount: '',
  lineTotal: '',
  note: '',
})

function recalcLine(line) {
  const mrp       = line.mrp     !== '' ? Number(line.mrp)       : null
  const rmPct     = line.rmPercent !== '' ? Number(line.rmPercent) : null
  const gstPct    = line.gstRate  !== '' ? Number(line.gstRate)   : null
  const netRate   = line.netRate  !== '' ? Number(line.netRate)   : null
  const cases     = Number(line.cases) || 0

  // TUR incl = MRP / (1 + RM%/100)
  const turIncl = mrp != null && mrp > 0 && rmPct != null
    ? mrp / (1 + rmPct / 100)
    : ''
  // TUR excl = TURincl / (1 + GST%/100)
  const turExcl = turIncl !== '' && gstPct != null
    ? turIncl / (1 + gstPct / 100)
    : ''
  // Disc% on TUR = (1 − netRate/TURincl) × 100
  const discPctOnTur = netRate != null && turIncl !== '' && turIncl > 0
    ? (1 - netRate / turIncl) * 100
    : ''
  // Disc% on MRP = (1 − netRate/MRP) × 100
  const discPctOnMrp = netRate != null && mrp != null && mrp > 0
    ? (1 - netRate / mrp) * 100
    : ''
  // Net Rate excl = netRate / (1 + GST%/100)
  const netRateExcl = netRate != null && gstPct != null
    ? netRate / (1 + gstPct / 100)
    : ''
  // Line total = cases × Net Rate incl
  const lineTotal = netRate != null ? cases * netRate : 0

  return { ...line, turIncl, turExcl, discPctOnTur, discPctOnMrp, netRateExcl, lineTotal }
}

/* ── Searchable product combobox ── */
function ProductCombobox({ items, value, displayValue, onSelect }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 320 })
  const triggerRef = useRef(null)
  const searchRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        !document.getElementById('product-combobox-drop')?.contains(e.target)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus search input when opened
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const openDropdown = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()

    // CSS animations with forwards fill-mode (e.g. animate-fade-in) apply transform: translateY(0)
    // permanently, which makes position:fixed children be positioned relative to that element
    // rather than the viewport. Detect such an ancestor and subtract its origin offset.
    let originTop = 0, originLeft = 0
    let el = triggerRef.current.parentElement
    while (el && el !== document.documentElement) {
      const t = window.getComputedStyle(el).transform
      if (t && t !== 'none') {
        const r = el.getBoundingClientRect()
        originTop = r.top
        originLeft = r.left
        break
      }
      el = el.parentElement
    }

    const spaceBelow = window.innerHeight - rect.bottom
    setDropPos({
      top: rect.bottom - originTop + 4,
      left: rect.left - originLeft,
      width: Math.max(rect.width, 320),
      maxHeight: Math.min(280, spaceBelow > 150 ? spaceBelow - 8 : 200),
    })
    setOpen(true)
  }

  const filtered = query.trim().length === 0
    ? items
    : items.filter(i =>
        i.name?.toLowerCase().includes(query.toLowerCase()) ||
        i.sku?.toLowerCase().includes(query.toLowerCase())
      )

  const handleSelect = item => {
    setQuery('')
    setOpen(false)
    onSelect(item.id)
  }

  const handleClear = e => {
    e.preventDefault()
    e.stopPropagation()
    setQuery('')
    setOpen(false)
    onSelect('')
  }

  const selectedItem = value ? items.find(i => String(i.id) === String(value)) : null

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={e => { e.preventDefault(); open ? (setOpen(false), setQuery('')) : openDropdown() }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
          open
            ? 'border-bhoomi-500 ring-2 ring-bhoomi-200 bg-white'
            : 'border-surface-200 bg-white hover:border-surface-400'
        }`}
        style={{ minWidth: 200 }}
      >
        <span className="flex-1 min-w-0">
          {selectedItem ? (
            <>
              <span className="block text-xs font-semibold text-surface-900 leading-tight truncate">{selectedItem.name}</span>
              <span className="block text-[10px] text-amber-700/80 leading-tight mt-0.5">
                {[selectedItem.sku, selectedItem.mrp != null ? `₹${selectedItem.mrp}` : null, selectedItem.gstRate != null ? `GST ${selectedItem.gstRate}%` : null].filter(Boolean).join(' · ')}
              </span>
            </>
          ) : (
            <span className="text-xs text-surface-400">Select product…</span>
          )}
        </span>
        {selectedItem ? (
          <span
            onMouseDown={handleClear}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-surface-400 hover:text-red-500 hover:bg-red-50 text-base font-medium leading-none"
          >×</span>
        ) : (
          <svg className="flex-shrink-0 w-3 h-3 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown — rendered via fixed position to escape overflow containers */}
      {open && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          id="product-combobox-drop"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white border border-surface-200 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Search bar */}
          <div className="px-3 py-2.5 border-b border-surface-100 bg-surface-50/80">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-surface-200 focus-within:border-bhoomi-400 focus-within:ring-2 focus-within:ring-bhoomi-100">
              <svg className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or SKU…"
                className="flex-1 text-sm outline-none bg-transparent text-surface-900 placeholder-surface-400"
              />
              {query ? (
                <button onMouseDown={() => setQuery('')} className="text-surface-400 hover:text-surface-700 text-base leading-none">×</button>
              ) : (
                <span className="text-[10px] text-surface-300 whitespace-nowrap">{items.length} items</span>
              )}
            </div>
          </div>
          {/* Results list */}
          <div style={{ maxHeight: dropPos.maxHeight || 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-sm text-surface-400 text-center">
                <div className="text-2xl mb-1">🔍</div>
                No products match "<span className="font-medium text-surface-600">{query}</span>"
              </div>
            ) : filtered.map(item => (
              <div
                key={item.id}
                onMouseDown={() => handleSelect(item)}
                className={`px-4 py-3 cursor-pointer border-b border-surface-50 last:border-0 transition-colors ${
                  String(item.id) === String(value)
                    ? 'bg-bhoomi-50 border-l-[3px] border-l-bhoomi-500'
                    : 'hover:bg-surface-50'
                }`}
              >
                <div className="font-semibold text-surface-900 text-sm leading-snug">{item.name}</div>
                <div className="text-xs text-amber-700/90 mt-0.5 flex items-center gap-1.5">
                  {item.sku && <span className="font-medium">{item.sku}</span>}
                  {item.sku && item.mrp != null && <span className="text-surface-300">·</span>}
                  {item.mrp != null && <span>MRP ₹{item.mrp}</span>}
                  {item.mrp != null && item.gstRate != null && <span className="text-surface-300">·</span>}
                  {item.gstRate != null && <span>GST {item.gstRate}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default function NewChallanPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [status, setStatus] = useState('SAVED')
  const [challanNumber, setChallanNumber] = useState('')
  const [challanDate, setChallanDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [locationId, setLocationId] = useState('')
  const [locations, setLocations] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [items, setItems] = useState([])
  const [lines, setLines] = useState([emptyLine()])
  const customerRef = useRef(null)

  // Source mode
  const [sourceMode, setSourceMode] = useState('MANUAL') // 'MANUAL' | 'RATE_CARD'
  const [sourceRateId, setSourceRateId] = useState(null)
  const [rateSearch, setRateSearch] = useState('')
  const [rateResults, setRateResults] = useState([])
  const [rateDropdownOpen, setRateDropdownOpen] = useState(false)
  const [selectedRate, setSelectedRate] = useState(null)
  const rateSearchRef = useRef(null)

  // Load reference data
  useEffect(() => {
    Promise.all([
      listLocations(),
      apiGet('/api/v1/cash-customers', { page: 0, size: 200 }),
      apiGet('/api/v1/items', { page: 0, size: 500 }),
    ]).then(([locs, custs, itms]) => {
      setLocations(Array.isArray(locs) ? locs : locs?.content || [])
      setCustomers(custs?.content || custs || [])
      setItems(itms?.content || itms || [])
    })
  }, [])

  // Load challan for edit
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    getChallan(id).then(c => {
      setChallanNumber(c.challanNumber || '')
      setChallanDate(c.challanDate || new Date().toISOString().slice(0, 10))
      setNotes(c.notes || '')
      setLocationId(c.locationId || '')
      setStatus(c.status || 'SAVED')
      setSelectedCustomer({ id: c.customerId, name: c.customerName, clusterName: c.clusterSnapshot })
      setCustomerSearch(c.customerName || '')
      setLines((c.items || []).map(l => ({
        _key: Math.random().toString(36).slice(2),
        itemId: l.itemId,
        sku: l.sku,
        productName: l.productName,
        packing: l.packing,
        pkg: '',
        mrp: l.mrp,
        gstRate: l.gstPercent || l.gstRate,
        cases: l.cases,
        rateMode: l.rateMode || 'NET',
        netRate: l.netRate || '',
        discPct: l.discPct || '',
        adhocAmount: l.adhocAmount || '',
        lineTotal: l.lineAmount || l.lineTotal || '',
        note: l.note || '',
      })))
    }).finally(() => setLoading(false))
  }, [id, isEdit])

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 25)

  // Rate card search
  useEffect(() => {
    if (sourceMode !== 'RATE_CARD') return
    if (!rateSearch || rateSearch.length < 2) { setRateResults([]); return }
    let active = true
    listRates({ q: rateSearch, size: 30 }).then(res => {
      if (active) setRateResults(res?.content || [])
    })
    return () => { active = false }
  }, [rateSearch, sourceMode])

  const handleRateCardSelect = (rate) => {
    setSelectedRate(rate)
    setSourceRateId(rate.id)
    setRateSearch(`${rate.quoteNumber} — ${rate.customerName}`)
    setRateDropdownOpen(false)
    // Lock customer from rate card
    setSelectedCustomer({ id: rate.customerId, name: rate.customerName, clusterName: rate.clusterSnapshot })
    setCustomerSearch(rate.customerName)
    // Prefill lines from rate items
    const prefilled = (rate.items || []).map(item => {
      const cases = item.cases != null ? item.cases : ''
      const netRate = item.netRate != null ? Number(item.netRate) : 0
      const lineTotal = (Number(cases) || 0) * netRate
      return {
        _key: Math.random().toString(36).slice(2),
        itemId: item.itemId || '',
        sku: item.sku || '',
        productName: item.productName || '',
        packing: item.packing || '',
        pkg: item.pkg != null ? String(item.pkg) : '',
        mrp: item.mrp != null ? Number(item.mrp) : '',
        rmPercent: item.rmPercent != null ? Number(item.rmPercent) : '',
        gstRate: item.gstPercent != null ? Number(item.gstPercent) : '',
        turIncl: item.turIncl != null ? Number(item.turIncl) : '',
        turExcl: item.turExcl != null ? Number(item.turExcl) : '',
        discPctOnTur: item.discPctOnTur != null ? Number(item.discPctOnTur) : '',
        discPctOnMrp: item.discPctOnMrp != null ? Number(item.discPctOnMrp) : '',
        netRateExcl: item.netRateExcl != null ? Number(item.netRateExcl) : '',
        cases,
        rateMode: 'NET',
        netRate: netRate || '',
        discPct: '',
        adhocAmount: '',
        lineTotal,
        note: item.note || '',
      }
    })
    setLines(prefilled.length > 0 ? prefilled : [emptyLine()])
  }

  const handleSourceModeChange = (mode) => {
    setSourceMode(mode)
    if (mode === 'MANUAL') {
      setSelectedRate(null)
      setSourceRateId(null)
      setRateSearch('')
      setRateResults([])
      // Unlock customer
      if (selectedRate) {
        setSelectedCustomer(null)
        setCustomerSearch('')
        setLines([emptyLine()])
      }
    }
  }

  const handleCustomerSelect = (c) => {
    setSelectedCustomer(c)
    setCustomerSearch(c.name)
    setCustomerDropdownOpen(false)
  }

  const handleItemSelect = (idx, itemId) => {
    if (!itemId) {
      setLines(ls => ls.map((l, i) => i === idx ? recalcLine({
        ...l,
        itemId: '', sku: '', productName: '', packing: '', pkg: '',
        mrp: '', gstRate: '',
      }) : l))
      return
    }
    const item = items.find(i => String(i.id) === String(itemId))
    if (!item) return
    setLines(ls => ls.map((l, i) => i === idx ? recalcLine({
      ...l,
      itemId: item.id,
      sku: item.sku || '',
      productName: item.name || '',
      packing: item.standardPacking || item.packing || '',
      pkg: item.pkg != null ? String(item.pkg) : '',
      mrp: item.mrp != null ? Number(item.mrp) : '',
      gstRate: item.gstRate != null ? Number(item.gstRate) : (item.gstPercent != null ? Number(item.gstPercent) : ''),
    }) : l))
  }

  const updateLine = (idx, field, value) => {
    setLines(ls => ls.map((l, i) => {
      if (i !== idx) return l
      return recalcLine({ ...l, [field]: value })
    }))
  }

  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const removeLine = (idx) => setLines(ls => ls.filter((_, i) => i !== idx))

  const totalAmount = lines.reduce((sum, l) => sum + (Number(l.lineTotal) || 0), 0)

  const buildPayload = () => ({
    customerId: selectedCustomer?.id,
    challanDate,
    locationId: locationId || undefined,
    notes: notes || undefined,
    sourceRateId: sourceRateId || undefined,
    items: lines.filter(l => l.itemId).map(l => ({
      itemId: l.itemId,
      productName: l.productName || undefined,
      sku: l.sku || undefined,
      packing: l.packing || undefined,
      mrp: l.mrp !== '' ? Number(l.mrp) : undefined,
      gstPercent: l.gstRate !== '' ? Number(l.gstRate) : undefined,
      cases: Number(l.cases) || 0,
      rateMode: 'NET',
      netRate: l.netRate !== '' ? Number(l.netRate) : undefined,
      lineAmount: l.lineTotal ? Number(l.lineTotal) : undefined,
      adhoc: false,
    })),
  })

  const handleSave = async () => {
    if (!selectedCustomer) { alert('Please select a customer.'); return }
    setSaving(true)
    try {
      const payload = buildPayload()
      if (isEdit) {
        await updateChallan(id, payload)
        navigate(ROUTES.CHALLAN_VIEW.replace(':id', id))
      } else {
        const challan = await createChallan(payload)
        navigate(ROUTES.CHALLAN_VIEW.replace(':id', challan.id))
      }
    } catch (e) {
      alert(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDispatch = async () => {
    if (!isEdit) return
    setSaving(true)
    try { await markDispatched(id); setStatus('DISPATCHED') }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDeliver = async () => {
    if (!isEdit) return
    setSaving(true)
    try { await markDelivered(id); setStatus('DELIVERED') }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (!window.confirm('Archive this challan?')) return
    try { await deleteChallan(id); navigate(ROUTES.CHALLANS) }
    catch (e) { alert(e.message) }
  }

  const readOnly = isEdit && !['SAVED', 'DISPATCHED'].includes(status)

  if (loading) return (
    <AppLayout title={isEdit ? 'Edit Challan' : 'New Challan'}>
      <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
    </AppLayout>
  )

  return (
    <AppLayout
      title={isEdit ? (challanNumber || 'Edit Challan') : 'New Challan'}
      breadcrumbs={['Cash Sales', 'Challans', isEdit ? challanNumber : 'New']}
      actions={
        <div className="flex gap-2 items-center">
          {isEdit && (
            <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', STATUS_META[status]?.className)}>
              {STATUS_META[status]?.label || status}
            </span>
          )}
          {isEdit && (
            <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.CHALLAN_VIEW.replace(':id', id))}>
              <Eye className="h-4 w-4" /> View
            </Button>
          )}
          {isEdit && status === 'SAVED' && (
            <Button variant="secondary" size="sm" onClick={handleDispatch} disabled={saving}>
              <Truck className="h-4 w-4" /> Mark Dispatched
            </Button>
          )}
          {isEdit && status === 'DISPATCHED' && (
            <Button variant="secondary" size="sm" onClick={handleDeliver} disabled={saving}>
              <CheckCircle className="h-4 w-4" /> Mark Delivered
            </Button>
          )}
          {isEdit && status !== 'ARCHIVED' && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Archive
            </Button>
          )}
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Update' : 'Save Challan'}
            </Button>
          )}
        </div>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-6 max-w-5xl">
        {/* Header fields */}
        <Card>
          <CardBody className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Source selector — new challans only */}
            {!isEdit && (
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-surface-600 mb-2">Source</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleSourceModeChange('MANUAL')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      sourceMode === 'MANUAL'
                        ? 'border-bhoomi-500 bg-bhoomi-50 text-bhoomi-700'
                        : 'border-surface-300 bg-white text-surface-600 hover:border-bhoomi-300'
                    )}
                  >
                    <PenLine className="h-4 w-4" />
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSourceModeChange('RATE_CARD')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      sourceMode === 'RATE_CARD'
                        ? 'border-bhoomi-500 bg-bhoomi-50 text-bhoomi-700'
                        : 'border-surface-300 bg-white text-surface-600 hover:border-bhoomi-300'
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    From Rate Card
                  </button>
                </div>
              </div>
            )}

            {/* Rate Card picker */}
            {!isEdit && sourceMode === 'RATE_CARD' && (
              <div className="md:col-span-4 relative" ref={rateSearchRef}>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Select Rate Card *</label>
                <input
                  value={rateSearch}
                  onChange={e => { setRateSearch(e.target.value); setRateDropdownOpen(true) }}
                  onFocus={() => setRateDropdownOpen(true)}
                  placeholder="Search by customer name or quote number…"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
                />
                {rateDropdownOpen && rateResults.length > 0 && (
                  <ul className="absolute z-40 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-64 overflow-y-auto text-sm">
                    {rateResults.map(r => (
                      <li
                        key={r.id}
                        className="px-3 py-2.5 hover:bg-bhoomi-50 cursor-pointer"
                        onMouseDown={e => { e.preventDefault(); handleRateCardSelect(r) }}
                      >
                        <div className="font-medium">{r.customerName}</div>
                        <div className="text-xs text-surface-500 flex gap-3 mt-0.5">
                          <span>{r.quoteNumber}</span>
                          {r.rateDate && <span>{r.rateDate}</span>}
                          {r.totalCases != null && <span>{r.totalCases} cases</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedRate && (
                  <div className="mt-1.5 flex gap-4 text-xs text-surface-500">
                    <span>Quote: <strong className="text-surface-700">{selectedRate.quoteNumber}</strong></span>
                    <span>Date: <strong className="text-surface-700">{selectedRate.rateDate}</strong></span>
                    {selectedRate.validTill && <span>Valid till: <strong className="text-surface-700">{selectedRate.validTill}</strong></span>}
                    {selectedRate.totalCases != null && <span>Cases: <strong className="text-surface-700">{selectedRate.totalCases}</strong></span>}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Challan #</label>
              <input
                value={challanNumber || 'Auto-generated'}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 bg-surface-50 text-surface-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Date *</label>
              <input
                type="date"
                value={challanDate}
                onChange={e => setChallanDate(e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 disabled:bg-surface-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="relative md:col-span-1" ref={customerRef}>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Customer *</label>
              {sourceMode === 'RATE_CARD' && selectedRate ? (
                <input
                  value={selectedRate.customerName}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 bg-surface-50 text-surface-500 cursor-not-allowed"
                />
              ) : (
                <input
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setCustomerDropdownOpen(true) }}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  disabled={readOnly}
                  placeholder="Search customer..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 disabled:bg-surface-50 disabled:cursor-not-allowed"
                />
              )}
              {customerDropdownOpen && filteredCustomers.length > 0 && (
                <ul className="absolute z-40 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-56 overflow-y-auto text-sm">
                  {filteredCustomers.map(c => (
                    <li
                      key={c.id}
                      className="px-3 py-2.5 hover:bg-bhoomi-50 cursor-pointer"
                      onMouseDown={e => { e.preventDefault(); handleCustomerSelect(c) }}
                    >
                      <div className="font-medium">{c.name}</div>
                      {(c.clusterName || c.category) && (
                        <div className="text-xs text-surface-500">{[c.clusterName, c.category].filter(Boolean).join(' · ')}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {selectedCustomer && (
                <div className="mt-1 text-xs text-surface-500">
                  {selectedCustomer.clusterName && <span>{selectedCustomer.clusterName}</span>}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Location (Zoho)</label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 disabled:bg-surface-50 disabled:cursor-not-allowed"
              >
                <option value="">Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-surface-600 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={readOnly}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 disabled:bg-surface-50 disabled:cursor-not-allowed resize-none"
              />
            </div>
          </CardBody>
        </Card>

        {/* Line items */}
        <Card>
          <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-800">Products</h3>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4" /> Add Row
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            {sourceMode === 'RATE_CARD' ? (
              /* ── Rate Card line table — all columns ── */
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-100">
                  <tr>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-surface-400 w-8">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-600 min-w-[160px]">PRODUCT</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-surface-500">PKG</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-surface-500">MRP</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-surface-500">RM%</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-surface-500">GST%</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-surface-400 bg-surface-100/60">TUR(incl)</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-surface-400 bg-surface-100/60">TUR(excl)</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-amber-600/80 bg-amber-50/60">Disc%<br/>TUR</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-amber-600/80 bg-amber-50/60">Disc%<br/>MRP</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-surface-500">Net(excl)</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-bhoomi-700 bg-blue-50/50">Net Rate<br/>(incl.)</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-surface-700 w-20">Cases</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-surface-700 bg-blue-50/50">Amount</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-surface-500 min-w-[100px]">Note</th>
                    {!readOnly && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {lines.map((line, idx) => (
                    <tr key={line._key} className={cn(idx % 2 === 1 && 'bg-surface-50/60')}>
                      {/* # */}
                      <td className="px-2 py-2 text-center text-xs text-surface-400">{idx + 1}</td>
                      {/* Product — locked */}
                      <td className="px-3 py-2">
                        <div className="font-medium text-surface-900 text-xs leading-tight">{line.productName || '—'}</div>
                        {line.sku && <div className="text-xs text-surface-400 mt-0.5">{line.sku}</div>}
                      </td>
                      {/* PKG — locked */}
                      <td className="px-2 py-2 text-center text-surface-600 text-xs">{line.pkg || '—'}</td>
                      {/* MRP — locked */}
                      <td className="px-2 py-2 text-right text-surface-600 text-xs whitespace-nowrap">
                        {line.mrp !== '' ? Number(line.mrp).toFixed(0) : '—'}
                      </td>
                      {/* RM% — locked */}
                      <td className="px-2 py-2 text-right text-surface-500 text-xs">
                        {line.rmPercent !== '' ? `${Number(line.rmPercent).toFixed(1)}%` : '—'}
                      </td>
                      {/* GST% — locked */}
                      <td className="px-2 py-2 text-right text-surface-500 text-xs">
                        {line.gstRate !== '' ? `${Number(line.gstRate).toFixed(0)}%` : '—'}
                      </td>
                      {/* TUR(incl) — locked */}
                      <td className="px-2 py-2 text-right text-surface-500 text-xs bg-surface-100/40">
                        {line.turIncl !== '' ? Number(line.turIncl).toFixed(3) : '—'}
                      </td>
                      {/* TUR(excl) — locked */}
                      <td className="px-2 py-2 text-right text-surface-500 text-xs bg-surface-100/40">
                        {line.turExcl !== '' ? Number(line.turExcl).toFixed(3) : '—'}
                      </td>
                      {/* Disc%TUR — locked */}
                      <td className="px-2 py-2 text-right text-amber-700 text-xs bg-amber-50/40">
                        {line.discPctOnTur !== '' ? `${Number(line.discPctOnTur).toFixed(2)}%` : '—'}
                      </td>
                      {/* Disc%MRP — locked */}
                      <td className="px-2 py-2 text-right text-amber-700 text-xs bg-amber-50/40">
                        {line.discPctOnMrp !== '' ? `${Number(line.discPctOnMrp).toFixed(2)}%` : '—'}
                      </td>
                      {/* Net Rate excl — locked */}
                      <td className="px-2 py-2 text-right text-surface-600 text-xs">
                        {line.netRateExcl !== '' ? Number(line.netRateExcl).toFixed(3) : '—'}
                      </td>
                      {/* Net Rate incl — locked */}
                      <td className="px-2 py-2 text-right font-semibold text-bhoomi-700 text-xs bg-blue-50/40">
                        {line.netRate !== '' ? Number(line.netRate).toFixed(3) : '—'}
                      </td>
                      {/* Cases — editable */}
                      <td className="px-2 py-2">
                        {readOnly ? (
                          <span className="block text-center text-xs">{line.cases}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={line.cases}
                            onChange={e => updateLine(idx, 'cases', e.target.value)}
                            className="w-16 px-2 py-1 text-xs rounded border border-surface-300 text-center focus:outline-none focus:ring-1 focus:ring-bhoomi-500"
                          />
                        )}
                      </td>
                      {/* Amount — calculated */}
                      <td className="px-2 py-2 text-right font-semibold text-surface-900 text-xs bg-blue-50/40 whitespace-nowrap">
                        {line.lineTotal ? `₹${Number(line.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      {/* Note — editable */}
                      <td className="px-2 py-2">
                        {readOnly ? (
                          <span className="text-surface-500 text-xs">{line.note}</span>
                        ) : (
                          <input
                            type="text"
                            value={line.note}
                            onChange={e => updateLine(idx, 'note', e.target.value)}
                            placeholder="optional"
                            className="w-full px-2 py-1 text-xs rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500"
                          />
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-1 py-2">
                          <button onClick={() => removeLine(idx)} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-300 bg-surface-50">
                    <td colSpan={13} className="px-3 py-3 text-right font-semibold text-surface-700 text-sm">Total Amount</td>
                    <td className="px-2 py-3 text-right font-bold text-surface-900 text-sm whitespace-nowrap">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={readOnly ? 1 : 2} />
                  </tr>
                </tfoot>
              </table>
            ) : (
              /* ── Manual line table ── */
              <table className="w-full text-sm border-collapse">
                <thead>
                  {/* Group header row */}
                  <tr className="border-b border-surface-100">
                    <th colSpan={6} className="bg-white" />
                    <th colSpan={2} className="px-2 py-1 text-center text-[10px] font-bold text-surface-500 bg-slate-100/80 border-l border-r border-slate-200 tracking-wider uppercase">TUR</th>
                    <th colSpan={2} className="px-2 py-1 text-center text-[10px] font-bold text-amber-700 bg-amber-50 border-l border-r border-amber-200 tracking-wider uppercase">Discount %</th>
                    <th colSpan={1} className="bg-white" />
                    <th colSpan={2} className="px-2 py-1 text-center text-[10px] font-bold text-blue-700 bg-blue-50 border-l border-r border-blue-200 tracking-wider uppercase">Net Rate</th>
                    <th colSpan={readOnly ? 2 : 3} className="bg-white" />
                  </tr>
                  {/* Column header row */}
                  <tr className="bg-surface-50/80 border-b-2 border-surface-200">
                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-surface-400 w-8">#</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-surface-600 tracking-wider min-w-[200px]">PRODUCT</th>
                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-surface-500 tracking-wider">PKG</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-surface-500 tracking-wider">MRP</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-surface-700 tracking-wider">RM%</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-surface-500 tracking-wider">GST%</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-slate-500 bg-slate-50 tracking-wider border-l border-slate-200">Incl.</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-slate-500 bg-slate-50 tracking-wider border-r border-slate-200">Excl.</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-amber-700 bg-amber-50/80 tracking-wider border-l border-amber-200">on TUR</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-amber-700 bg-amber-50/80 tracking-wider border-r border-amber-200">on MRP</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-surface-500 tracking-wider">Net(excl)</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-blue-700 bg-blue-50/80 tracking-wider border-l border-blue-200">Incl. ₹</th>
                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-surface-700 tracking-wider border-r border-blue-200">Cases</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-surface-700 tracking-wider">Amount</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-surface-400 tracking-wider min-w-[100px]">Note</th>
                    {!readOnly && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {lines.map((line, idx) => (
                    <tr key={line._key} className={cn('hover:bg-surface-50/80 transition-colors', idx % 2 === 1 && 'bg-surface-50/40')}>
                      {/* # */}
                      <td className="px-2 py-2.5 text-center text-xs text-surface-400 font-medium">{idx + 1}</td>
                      {/* Product */}
                      <td className="px-2 py-1.5">
                        {readOnly ? (
                          <>
                            <div className="font-semibold text-surface-900 text-xs leading-tight">{line.productName || '—'}</div>
                            {line.sku && <div className="text-[10px] text-amber-700/80 mt-0.5">{line.sku}</div>}
                          </>
                        ) : (
                          <ProductCombobox
                            items={items}
                            value={line.itemId}
                            displayValue={line.productName}
                            onSelect={itemId => handleItemSelect(idx, itemId)}
                          />
                        )}
                      </td>
                      {/* PKG — locked */}
                      <td className="px-2 py-2.5 text-center text-xs text-surface-600 font-medium">{line.pkg || line.packing || <span className="text-surface-300">—</span>}</td>
                      {/* MRP — locked */}
                      <td className="px-2 py-2.5 text-right text-xs text-surface-700 font-medium whitespace-nowrap">
                        {line.mrp !== '' ? Number(line.mrp).toFixed(0) : <span className="text-surface-300">—</span>}
                      </td>
                      {/* RM% — editable ✏️ */}
                      <td className="px-2 py-1.5">
                        {readOnly ? (
                          <span className="block text-right text-xs text-surface-700 font-medium">
                            {line.rmPercent !== '' ? `${Number(line.rmPercent).toFixed(1)}%` : <span className="text-surface-300">—</span>}
                          </span>
                        ) : (
                          <input
                            type="number" min={0} max={100} step={0.1}
                            value={line.rmPercent}
                            onChange={e => updateLine(idx, 'rmPercent', e.target.value)}
                            placeholder="—"
                            className="w-16 px-2 py-1.5 text-xs rounded-lg border-2 border-surface-200 bg-yellow-50/60 text-right font-medium focus:outline-none focus:border-bhoomi-400 focus:bg-white placeholder-surface-300"
                          />
                        )}
                      </td>
                      {/* GST% — locked */}
                      <td className="px-2 py-2.5 text-right text-xs text-surface-500">
                        {line.gstRate !== '' ? `${Number(line.gstRate).toFixed(0)}%` : <span className="text-surface-300">—</span>}
                      </td>
                      {/* TUR(incl) — calculated */}
                      <td className="px-2 py-2.5 text-right text-xs text-slate-500 bg-slate-50/60 border-l border-slate-100">
                        {line.turIncl !== '' ? Number(line.turIncl).toFixed(2) : <span className="text-surface-200">—</span>}
                      </td>
                      {/* TUR(excl) — calculated */}
                      <td className="px-2 py-2.5 text-right text-xs text-slate-500 bg-slate-50/60 border-r border-slate-100">
                        {line.turExcl !== '' ? Number(line.turExcl).toFixed(2) : <span className="text-surface-200">—</span>}
                      </td>
                      {/* Disc%TUR — calculated */}
                      <td className="px-2 py-2.5 text-right text-xs text-amber-700 font-medium bg-amber-50/50 border-l border-amber-100">
                        {line.discPctOnTur !== '' ? `${Number(line.discPctOnTur).toFixed(2)}%` : <span className="text-amber-200">—</span>}
                      </td>
                      {/* Disc%MRP — calculated */}
                      <td className="px-2 py-2.5 text-right text-xs text-amber-700 font-medium bg-amber-50/50 border-r border-amber-100">
                        {line.discPctOnMrp !== '' ? `${Number(line.discPctOnMrp).toFixed(2)}%` : <span className="text-amber-200">—</span>}
                      </td>
                      {/* Net Rate excl — calculated */}
                      <td className="px-2 py-2.5 text-right text-xs text-surface-500">
                        {line.netRateExcl !== '' ? Number(line.netRateExcl).toFixed(2) : <span className="text-surface-200">—</span>}
                      </td>
                      {/* Net Rate incl — editable ✏️ */}
                      <td className="px-2 py-1.5 bg-blue-50/40 border-l border-blue-100">
                        {readOnly ? (
                          <span className="block text-right font-bold text-blue-700 text-xs">
                            {line.netRate !== '' ? Number(line.netRate).toFixed(2) : '—'}
                          </span>
                        ) : (
                          <input
                            type="number" min={0} step={0.01}
                            value={line.netRate}
                            onChange={e => updateLine(idx, 'netRate', e.target.value)}
                            placeholder="—"
                            className="w-20 px-2 py-1.5 text-xs rounded-lg border-2 border-blue-200 bg-white text-right font-bold text-blue-700 focus:outline-none focus:border-blue-400 placeholder-blue-200"
                          />
                        )}
                      </td>
                      {/* Cases — editable ✏️ */}
                      <td className="px-2 py-1.5 border-r border-blue-100">
                        {readOnly ? (
                          <span className="block text-center text-xs font-medium">{line.cases}</span>
                        ) : (
                          <input
                            type="number" min={0}
                            value={line.cases}
                            onChange={e => updateLine(idx, 'cases', e.target.value)}
                            className="w-16 px-2 py-1.5 text-xs rounded-lg border-2 border-surface-200 bg-yellow-50/60 text-center font-medium focus:outline-none focus:border-bhoomi-400 focus:bg-white"
                          />
                        )}
                      </td>
                      {/* Amount — calculated */}
                      <td className="px-3 py-2.5 text-right font-bold text-surface-900 text-xs whitespace-nowrap">
                        {line.lineTotal
                          ? <span className="text-surface-900">₹{Number(line.lineTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          : <span className="text-surface-300">—</span>}
                      </td>
                      {/* Note — editable */}
                      <td className="px-2 py-1.5">
                        {readOnly ? (
                          <span className="text-surface-500 text-xs">{line.note}</span>
                        ) : (
                          <input
                            type="text"
                            value={line.note}
                            onChange={e => updateLine(idx, 'note', e.target.value)}
                            placeholder="note…"
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-surface-200 bg-white focus:outline-none focus:border-surface-400 placeholder-surface-300"
                          />
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-1 py-2.5">
                          <button onClick={() => removeLine(idx)} className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-200 bg-surface-50">
                    <td colSpan={13} className="px-4 py-3.5 text-right text-xs font-semibold text-surface-500 tracking-wider uppercase">Total Amount</td>
                    <td className="px-3 py-3.5 text-right font-bold text-surface-900 text-base whitespace-nowrap">
                      ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td colSpan={readOnly ? 1 : 2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </Card>

        {!readOnly && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(ROUTES.CHALLANS)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Update' : 'Save Challan'}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
