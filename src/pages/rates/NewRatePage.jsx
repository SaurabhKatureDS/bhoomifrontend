import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, X, Image, Copy, Save, Trash2, ArrowLeft, ChevronDown } from 'lucide-react'
import { toPng, toBlob } from 'html-to-image'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { listCashCustomers, listGstCustomers } from '@/api/customers'
import { listItems } from '@/api/items'
import { createRate, updateRate, getRate, getLastSharedRate, deleteRate } from '@/api/rates'
import RateQuoteImage from './RateQuoteImage'
import { cn } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

// ── calculation helpers ──────────────────────────────────────────────────────

const round = (v, d = 3) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d)

function calcItem(item) {
  const { mrp, rmPercent, gstPercent, rateMode, discPctOnTur, discPctOnMrp, netRateIncl: inputNet, pkg, cases } = item

  const turIncl = mrp != null && rmPercent != null
    ? round(mrp / (1 + rmPercent / 100))
    : null
  const turExcl = turIncl != null && gstPercent != null
    ? round(turIncl / (1 + gstPercent / 100))
    : null

  let netRateExcl = null
  let netRateIncl = null
  let discTur = item.discPctOnTur
  let discMrp = item.discPctOnMrp

  if (rateMode === 'DISC_TUR') {
    if (discPctOnTur != null && turExcl != null && gstPercent != null) {
      netRateExcl = round(turExcl * (1 - discPctOnTur / 100))
      netRateIncl = round(netRateExcl * (1 + gstPercent / 100))
      discMrp = mrp ? round((mrp - netRateIncl) / mrp * 100) : null
    }
  } else if (rateMode === 'DISC_MRP') {
    if (discPctOnMrp != null && mrp != null) {
      netRateIncl = round(mrp * (1 - discPctOnMrp / 100))
      netRateExcl = gstPercent != null ? round(netRateIncl / (1 + gstPercent / 100)) : null
      discTur = turExcl && netRateExcl ? round((turExcl - netRateExcl) / turExcl * 100) : null
    }
  } else { // NET
    if (inputNet != null) {
      netRateIncl = inputNet
      netRateExcl = gstPercent != null ? round(netRateIncl / (1 + gstPercent / 100)) : null
      discTur = turExcl && netRateExcl ? round((turExcl - netRateExcl) / turExcl * 100) : null
      discMrp = mrp ? round((mrp - netRateIncl) / mrp * 100) : null
    }
  }

  const lineAmount = netRateIncl != null && pkg && cases
    ? round(netRateIncl * pkg * cases, 2)
    : null

  return { ...item, turIncl, turExcl, netRateExcl, netRateIncl, discPctOnTur: discTur, discPctOnMrp: discMrp, lineAmount }
}

// ── default column visibility ────────────────────────────────────────────────

const DEFAULT_VIS = {
  product: true, pkg: true, mrp: true, rmPct: false, gstPct: true,
  turIncl: false, turExcl: false, discTur: false, discMrp: false,
  netRateExcl: false, netRateIncl: true, cases: true, amount: true, note: false,
}

const VIS_LABELS = {
  product: 'Product', pkg: 'PKG', mrp: 'MRP', rmPct: 'RM%', gstPct: 'GST%',
  turIncl: 'TUR(incl)', turExcl: 'TUR(excl)', discTur: 'Disc%TUR',
  discMrp: 'Disc%MRP', netRateExcl: 'Net Rate(excl)', netRateIncl: 'Net Rate',
  cases: 'Cases', amount: 'Amount', note: 'Note',
}

const LOCKED_VIS = new Set(['product', 'netRateIncl', 'cases', 'amount'])

// ── helper to format date for display ───────────────────────────────────────

const fmtDateDisplay = (d) => {
  if (!d) return ''
  const parts = String(d).split('-')
  if (parts.length !== 3) return d
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parts[2]}-${months[parseInt(parts[1],10)-1]}-${parts[0]}`
}

const toIso = (d) => {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const addDays = (isoDate, days) => {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── status badge ─────────────────────────────────────────────────────────────

const STATUS_META = {
  SAVED: { label: 'Draft Saved', variant: 'default' },
  APPROVED: { label: 'Approved', variant: 'green' },
  FULFILLED_PARTIALLY: { label: 'Fulfilled Partially', variant: 'amber' },
  FULFILLED_FULLY: { label: 'Fulfilled Fully', variant: 'blue' },
  SALES_LOST: { label: 'Sales Lost', variant: 'red' },
  CLOSED: { label: 'Closed', variant: 'purple' },
  EXPIRED: { label: 'Expired', variant: 'red' },
}

// ── main component ────────────────────────────────────────────────────────────

export default function NewRatePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const imageRef = useRef(null)

  // header fields
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [cluster, setCluster] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [rateDate, setRateDate] = useState(todayIso())
  const [validityDays, setValidityDays] = useState(7)
  const [validTill, setValidTill] = useState(addDays(todayIso(), 7))
  const [status, setStatus] = useState('SAVED')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [lastShared, setLastShared] = useState(null)

  // items
  const [items, setItems] = useState([])

  // column visibility for WhatsApp image
  const [vis, setVis] = useState({ ...DEFAULT_VIS })

  // UI state
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showImage, setShowImage] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // customer type toggle: 'CASH' | 'GST'
  const [custType, setCustType] = useState('CASH')

  // customer search
  const [custSearch, setCustSearch] = useState('')
  const [custResults, setCustResults] = useState([])
  const [custLoading, setCustLoading] = useState(false)
  const [showCustDrop, setShowCustDrop] = useState(false)

  // item search (for adding products)
  const [itemSearch, setItemSearch] = useState('')
  const [itemResults, setItemResults] = useState([])
  const [itemLoading, setItemLoading] = useState(false)
  const [showItemDrop, setShowItemDrop] = useState(false)

  // load existing rate when editing
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    getRate(id)
      .then((r) => {
        setCustomerId(r.customerId)
        setCustomerName(r.customerName)
        setCluster(r.clusterSnapshot || '')
        setPoNumber(r.poNumber || '')
        setRateDate(r.rateDate || todayIso())
        setValidityDays(r.validityDays || 7)
        setValidTill(r.validTill || addDays(r.rateDate, r.validityDays || 7))
        setStatus(r.status || 'SAVED')
        setQuoteNumber(r.quoteNumber || '')
        setCustSearch(r.customerName || '')
        if (r.customerType) setCustType(r.customerType === 'GST' ? 'GST' : 'CASH')
        setItems(
          (r.items || []).map((it) => ({
            itemId: it.itemId,
            productName: it.productName,
            sku: it.sku,
            packing: it.packing,
            pkg: it.pkg,
            mrp: it.mrp != null ? Number(it.mrp) : null,
            rmPercent: it.rmPercent != null ? Number(it.rmPercent) : null,
            gstPercent: it.gstPercent != null ? Number(it.gstPercent) : null,
            turIncl: it.turIncl != null ? Number(it.turIncl) : null,
            turExcl: it.turExcl != null ? Number(it.turExcl) : null,
            rateMode: it.rateMode || 'NET',
            discPctOnTur: it.discPctOnTur != null ? Number(it.discPctOnTur) : null,
            discPctOnMrp: it.discPctOnMrp != null ? Number(it.discPctOnMrp) : null,
            netRateExcl: it.netRateExcl != null ? Number(it.netRateExcl) : null,
            netRateIncl: it.netRate != null ? Number(it.netRate) : null,
            cases: it.cases,
            lineAmount: it.lineAmount != null ? Number(it.lineAmount) : null,
            note: it.note || '',
          }))
        )
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, isEdit])

  // recalculate validTill when date or validity changes
  useEffect(() => {
    if (rateDate && validityDays) setValidTill(addDays(rateDate, Number(validityDays)))
  }, [rateDate, validityDays])

  // ── customer search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!custSearch || custSearch.length < 1) { setCustResults([]); return }
    const t = setTimeout(async () => {
      setCustLoading(true)
      try {
        if (custType === 'CASH') {
          const cash = await listCashCustomers({ q: custSearch, size: 15 })
          setCustResults((cash?.content || []).map((c) => ({ ...c, _type: 'CASH' })))
        } else {
          const gst = await listGstCustomers({ q: custSearch, size: 15 })
          setCustResults((gst?.content || []).map((c) => ({ ...c, _type: 'GST' })))
        }
      } catch { /* ignore */ }
      finally { setCustLoading(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [custSearch, custType])

  const selectCustomer = (c) => {
    setCustomerId(c.id)
    setCustomerName(c.name || c.companyName || '')
    setCluster(c.clusterName || c.cluster?.name || c.clusterSnapshot || '')
    setCustSearch(c.name || c.companyName || '')
    setShowCustDrop(false)
    setCustResults([])
    // fetch last shared
    getLastSharedRate(c.id).then((r) => r && setLastShared(r.rateDate)).catch(() => {})
  }

  // ── item search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!itemSearch || itemSearch.length < 1) { setItemResults([]); return }
    const t = setTimeout(async () => {
      setItemLoading(true)
      try {
        const data = await listItems({ q: itemSearch, status: 'ACTIVE', size: 15 })
        setItemResults(data?.content || [])
      } catch { /* ignore */ }
      finally { setItemLoading(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [itemSearch])

  const addItem = (it) => {
    const newItem = calcItem({
      itemId: it.id,
      productName: it.name,
      sku: it.sku,
      packing: it.packing,
      pkg: parsePkg(it.packing),
      mrp: it.mrp != null ? Number(it.mrp) : null,
      rmPercent: null,
      gstPercent: it.gstPercent != null ? Number(it.gstPercent) : null,
      rateMode: 'DISC_TUR',
      discPctOnTur: null,
      discPctOnMrp: null,
      netRateIncl: null,
      cases: null,
      note: '',
    })
    setItems((prev) => [...prev, newItem])
    setItemSearch('')
    setShowItemDrop(false)
    setItemResults([])
  }

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const updateItemField = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev]
      const updated = { ...next[idx], [field]: value === '' ? null : value }

      // If rateMode-driving field changed, set the mode
      if (field === 'discPctOnTur') updated.rateMode = 'DISC_TUR'
      if (field === 'discPctOnMrp') updated.rateMode = 'DISC_MRP'
      if (field === 'netRateIncl') updated.rateMode = 'NET'

      next[idx] = calcItem(updated)
      return next
    })
  }

  // ── validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!customerId) e.customer = 'Customer is required'
    if (!rateDate) e.rateDate = 'Date is required'
    if (!validityDays || validityDays < 1) e.validityDays = 'Must be ≥ 1'
    if (items.length === 0) e.items = 'Add at least one product'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = buildPayload()
      const saved = isEdit ? await updateRate(id, payload) : await createRate(payload)
      navigate(ROUTES.RATES)
    } catch (err) {
      alert(err?.message || 'Failed to save rate.')
    } finally {
      setSaving(false)
    }
  }

  const buildPayload = () => ({
    customerId,
    poNumber: poNumber || null,
    rateDate,
    validityDays: Number(validityDays),
    notes: null,
    items: items.map((item, idx) => ({
      itemId: item.itemId || null,
      productName: item.productName,
      sku: item.sku,
      packing: item.packing,
      pkg: item.pkg,
      mrp: item.mrp,
      rmPercent: item.rmPercent,
      gstPercent: item.gstPercent,
      turIncl: item.turIncl,
      turExcl: item.turExcl,
      rateMode: item.rateMode || 'NET',
      discPctOnTur: item.discPctOnTur,
      discPctOnMrp: item.discPctOnMrp,
      netRateExcl: item.netRateExcl,
      netRate: item.netRateIncl,
      cases: item.cases ? Number(item.cases) : null,
      note: item.note || null,
      columnVisibility: JSON.stringify(vis),
      sortOrder: idx,
    })),
  })

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Delete this rate quote? This cannot be undone.')) return
    try {
      await deleteRate(id)
      navigate(ROUTES.RATES)
    } catch (err) {
      alert(err?.message || 'Failed to delete.')
    }
  }

  // ── image generation ──────────────────────────────────────────────────────
  const rateForImage = {
    quoteNumber,
    customerName,
    rateDate,
    validTill,
    poNumber,
    items: items.map((item) => ({
      productName: item.productName,
      pkg: item.pkg,
      mrp: item.mrp,
      rmPercent: item.rmPercent,
      gstPercent: item.gstPercent,
      turIncl: item.turIncl,
      turExcl: item.turExcl,
      discPctOnTur: item.discPctOnTur,
      discPctOnMrp: item.discPctOnMrp,
      netRateExcl: item.netRateExcl,
      netRate: item.netRateIncl,
      cases: item.cases,
      lineAmount: item.lineAmount,
      note: item.note,
    })),
  }

  const getDownloadFilename = () => {
    const month = rateDate ? rateDate.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0')
    const qParts = (quoteNumber || '').split('/')
    const series = qParts.length >= 4 ? qParts[3] : '001'
    const name = (customerName || 'quote').trim().replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, '-').replace(/^-|-$/g, '')
    return `${month}-${series}-${name}`
  }

  const handleCopyImage = async () => {
    if (!imageRef.current) return
    setImageLoading(true)
    try {
      const blob = await toBlob(imageRef.current, { pixelRatio: 2, cacheBust: true })
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      // Fallback: trigger download
      try {
        const dataUrl = await toPng(imageRef.current, { pixelRatio: 2, cacheBust: true })
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${getDownloadFilename()}.png`
        a.click()
      } catch (e) {
        alert('Copy to clipboard not supported. Downloading instead.')
      }
    } finally {
      setImageLoading(false)
    }
  }

  const handleDownloadImage = async () => {
    if (!imageRef.current) return
    setImageLoading(true)
    try {
      const dataUrl = await toPng(imageRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${getDownloadFilename()}.png`
      a.click()
    } catch (err) {
      alert('Image generation failed.')
    } finally {
      setImageLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="Rate Quote" breadcrumbs={['Bhoomi Enterprises', 'Rates', isEdit ? 'Edit' : 'New Rate']}>
        <div className="flex items-center justify-center h-64"><Spinner /></div>
      </AppLayout>
    )
  }

  const totalCases = items.reduce((s, i) => s + (Number(i.cases) || 0), 0)
  const totalAmount = items.reduce((s, i) => s + (Number(i.lineAmount) || 0), 0)

  return (
    <AppLayout
      title={isEdit ? `Edit Quote — ${quoteNumber}` : 'New Rate Quote'}
      subtitle="Bhoomi Enterprises · Rates"
      breadcrumbs={['Bhoomi Enterprises', 'Rates', isEdit ? 'Edit Rate' : 'New Rate']}
      actions={
        <button onClick={() => navigate(ROUTES.RATES)} className="flex items-center gap-1 text-sm text-surface-600 hover:text-surface-900">
          <ArrowLeft className="h-4 w-4" /> Rate List
        </button>
      }
    >
      <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
        {/* ── Quote Details ── */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-surface-900">Quote Details</h2>
              {isEdit && status && (
                <Badge variant={STATUS_META[status]?.variant || 'default'}>
                  {STATUS_META[status]?.label || status}
                </Badge>
              )}
            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              {/* Customer */}
              <div className="relative md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Customer <span className="text-red-500">*</span>
                </label>

                {/* Customer type toggle */}
                <div className="flex mb-2 rounded-lg border border-surface-300 overflow-hidden w-fit">
                  <button
                    type="button"
                    onClick={() => { setCustType('CASH'); setCustSearch(''); setCustomerId(''); setCustomerName(''); setCluster(''); setCustResults([]) }}
                    className={cn(
                      'px-3 py-1 text-xs font-medium transition-colors',
                      custType === 'CASH'
                        ? 'bg-bhoomi-600 text-white'
                        : 'bg-white text-surface-600 hover:bg-surface-50'
                    )}
                  >
                    Cash Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustType('GST'); setCustSearch(''); setCustomerId(''); setCustomerName(''); setCluster(''); setCustResults([]) }}
                    className={cn(
                      'px-3 py-1 text-xs font-medium transition-colors border-l border-surface-300',
                      custType === 'GST'
                        ? 'bg-bhoomi-600 text-white border-l-bhoomi-700'
                        : 'bg-white text-surface-600 hover:bg-surface-50'
                    )}
                  >
                    GST Customer (Zoho Books)
                  </button>
                </div>

                <input
                  value={custSearch}
                  onChange={(e) => { setCustSearch(e.target.value); setShowCustDrop(true) }}
                  onFocus={() => setShowCustDrop(true)}
                  placeholder={custType === 'CASH' ? 'Search cash customer…' : 'Search GST customer (Zoho Books)…'}
                  className={cn(
                    'w-full rounded-lg border bg-surface-50 px-3 py-2.5 text-sm',
                    errors.customer ? 'border-red-500' : 'border-surface-300 focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20'
                  )}
                />
                {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
                {showCustDrop && (custResults.length > 0 || custLoading) && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-surface-200 max-h-52 overflow-auto">
                    {custLoading && <div className="px-3 py-2 text-xs text-surface-500">Searching…</div>}
                    {custResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-50 text-sm flex items-center gap-2"
                      >
                        <span className={cn('text-[10px] rounded px-1 py-0.5 font-medium', c._type === 'GST' ? 'bg-blue-50 text-blue-700' : 'bg-surface-100 text-surface-600')}>
                          {c._type}
                        </span>
                        <span className="font-medium">{c.name || c.companyName}</span>
                        {c.cluster?.name && <span className="text-xs text-surface-400">· {c.cluster.name}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cluster (read-only) */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Cluster</label>
                <div className="rounded-lg border border-surface-200 bg-surface-100 px-3 py-2.5 text-sm text-surface-500 min-h-[40px]">
                  {cluster || '—'}
                </div>
              </div>

              {/* PO Number */}
              <Input
                label="PO Number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Customer PO (if shared)"
              />

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className={cn(
                    'w-full rounded-lg border bg-surface-50 px-3 py-2.5 text-sm',
                    errors.rateDate ? 'border-red-500' : 'border-surface-300'
                  )}>
                    {rateDate ? fmtDateDisplay(rateDate) : 'Select date…'}
                  </div>
                  <input
                    type="date"
                    value={rateDate}
                    onChange={(e) => setRateDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {errors.rateDate && <p className="text-xs text-red-500 mt-1">{errors.rateDate}</p>}
              </div>

              {/* Validity days */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Validity (days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={validityDays}
                  min={1}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border bg-surface-50 px-3 py-2.5 text-sm',
                    errors.validityDays ? 'border-red-500' : 'border-surface-300 focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20'
                  )}
                />
                {errors.validityDays && <p className="text-xs text-red-500 mt-1">{errors.validityDays}</p>}
              </div>

              {/* Valid till */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Valid Till</label>
                <div className="rounded-lg border border-surface-200 bg-surface-100 px-3 py-2.5 text-sm text-surface-700">
                  {validTill ? fmtDateDisplay(validTill) : '—'}
                </div>
              </div>
            </div>

            {lastShared && (
              <div className="mt-4 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-lg">
                📋 Last rate shared on {fmtDateDisplay(lastShared)}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── WhatsApp Image Columns ── */}
        <Card>
          <CardBody>
            <p className="text-xs text-surface-500 mb-3">Toggle columns to include in WhatsApp image (Product, Net Rate, Cases, Amount always visible)</p>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {Object.entries(VIS_LABELS).map(([key, label]) => {
                const locked = LOCKED_VIS.has(key)
                const on = vis[key] !== false
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setVis((v) => ({ ...v, [key]: !v[key] }))}
                    className={cn('flex flex-col items-center gap-1.5', locked ? 'cursor-not-allowed' : 'cursor-pointer')}
                  >
                    <span className={cn('text-xs font-medium leading-none', on ? 'text-surface-800' : 'text-surface-400', locked && 'opacity-60')}>
                      {label}
                    </span>
                    <div className={cn(
                      'w-9 h-5 rounded-full relative transition-colors duration-200',
                      on ? 'bg-bhoomi-600' : 'bg-surface-300',
                      locked && 'opacity-60'
                    )}>
                      <div className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                        on ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </div>
                  </button>
                )
              })}
            </div>
          </CardBody>
        </Card>

        {/* ── Rate Items ── */}
        <Card>
          <CardBody className="p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h2 className="text-base font-semibold text-surface-900">Rate Items</h2>
              {/* Add product search */}
              <div className="relative w-64">
                <input
                  value={itemSearch}
                  onChange={(e) => { setItemSearch(e.target.value); setShowItemDrop(true) }}
                  onFocus={() => setShowItemDrop(true)}
                  placeholder="Add product…"
                  className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20 focus:outline-none"
                />
                {showItemDrop && (itemResults.length > 0 || itemLoading) && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-surface-200 max-h-52 overflow-auto">
                    {itemLoading && <div className="px-3 py-2 text-xs text-surface-500">Searching…</div>}
                    {itemResults.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onMouseDown={() => addItem(it)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-50 text-sm"
                      >
                        <div className="font-medium text-surface-900">{it.name}</div>
                        <div className="text-xs text-surface-400">{it.sku} · MRP ₹{it.mrp} · GST {it.gstPercent}%</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {errors.items && (
              <p className="px-6 py-2 text-xs text-red-500 bg-red-50">{errors.items}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="px-3 py-2 text-left text-surface-500 font-medium w-6">#</th>
                    <th className="px-3 py-2 text-left text-surface-500 font-medium min-w-[160px]">PRODUCT</th>
                    <th className="px-3 py-2 text-center text-surface-500 font-medium w-14">PKG</th>
                    <th className="px-3 py-2 text-center text-surface-500 font-medium w-16">MRP</th>
                    <th className="px-3 py-2 text-center text-surface-500 font-medium w-16">RM%</th>
                    <th className="px-3 py-2 text-center text-surface-500 font-medium w-14">GST%</th>
                    <th className="px-3 py-2 text-center text-surface-500 font-medium w-20 bg-blue-50">TUR(incl)</th>
                    <th className="px-3 py-2 text-center text-surface-500 font-medium w-20 bg-blue-50">TUR(excl)</th>
                    <th className="px-3 py-2 text-center text-surface-600 font-semibold w-24 bg-amber-50">Disc% TUR</th>
                    <th className="px-3 py-2 text-center text-surface-600 font-semibold w-24 bg-amber-50">Disc% MRP</th>
                    <th className="px-3 py-2 text-center text-surface-500 font-medium w-20 bg-blue-50">Net(excl)</th>
                    <th className="px-3 py-2 text-center text-surface-600 font-semibold w-24 bg-green-50">Net Rate (incl.)</th>
                    <th className="px-3 py-2 text-center text-surface-600 font-semibold w-16">Cases</th>
                    <th className="px-3 py-2 text-right text-surface-500 font-medium w-24 bg-blue-50">Amount</th>
                    <th className="px-3 py-2 text-left text-surface-500 font-medium w-28">Note</th>
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <RateItemRow
                      key={idx}
                      item={item}
                      idx={idx}
                      onChange={(field, val) => updateItemField(idx, field, val)}
                      onRemove={() => removeItem(idx)}
                    />
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={16} className="py-10 text-center text-sm text-surface-400">
                        No products yet. Search above to add items.
                      </td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-surface-50 border-t-2 border-surface-200 font-semibold">
                      <td colSpan={12} className="px-3 py-2 text-right text-surface-600 text-xs">Total</td>
                      <td className="px-3 py-2 text-center text-surface-900">{totalCases}</td>
                      <td className="px-3 py-2 text-right text-surface-900">
                        ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(totalAmount)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardBody>
        </Card>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImage((p) => !p)}
              className="gap-1"
            >
              <Image className="h-3.5 w-3.5" />
              {showImage ? 'Hide Preview' : 'Preview Image'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={imageLoading}
              onClick={handleCopyImage}
              className="gap-1"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied!' : 'Copy for WhatsApp'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={imageLoading}
              onClick={handleDownloadImage}
              className="gap-1"
            >
              <Image className="h-3.5 w-3.5" />
              Download Image
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <Button variant="danger" size="sm" onClick={handleDelete} className="gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSave}
              className="gap-1"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        {/* Off-screen capture target — always rendered so copy/download works without opening preview */}
        <div style={{ position: 'fixed', left: -10000, top: -10000, pointerEvents: 'none', zIndex: -1 }}>
          <RateQuoteImage ref={imageRef} rate={rateForImage} visibleCols={vis} />
        </div>

        {/* ── Image preview ── */}
        {showImage && (
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-surface-700 mb-4">WhatsApp Image Preview</h3>
              <div className="overflow-x-auto">
                <RateQuoteImage rate={rateForImage} visibleCols={vis} />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

// ── Rate Item Row ─────────────────────────────────────────────────────────────

function RateItemRow({ item, idx, onChange, onRemove }) {
  const numInput = (field, val, cls = '') => (
    <input
      type="number"
      value={val ?? ''}
      onChange={(e) => onChange(field, e.target.value === '' ? null : Number(e.target.value))}
      className={cn(
        'w-full rounded border border-surface-300 bg-white px-1.5 py-1 text-xs text-center focus:border-bhoomi-500 focus:outline-none focus:ring-1 focus:ring-bhoomi-500/30',
        cls
      )}
      step="any"
    />
  )

  const readOnly = (val, decimals = 3) => (
    <span className="block text-center text-surface-700">
      {val != null ? Number(val).toFixed(decimals) : '—'}
    </span>
  )

  const modeHighlight = (field) => {
    if (field === 'discTur' && item.rateMode === 'DISC_TUR') return 'ring-2 ring-amber-400 ring-offset-1 rounded'
    if (field === 'discMrp' && item.rateMode === 'DISC_MRP') return 'ring-2 ring-amber-400 ring-offset-1 rounded'
    if (field === 'net' && item.rateMode === 'NET') return 'ring-2 ring-green-400 ring-offset-1 rounded'
    return ''
  }

  return (
    <tr className="border-b border-surface-100 hover:bg-surface-50/50">
      <td className="px-3 py-1.5 text-center text-surface-400">{idx + 1}</td>
      <td className="px-3 py-1.5">
        <div className="font-medium text-surface-900 text-xs leading-tight">{item.productName}</div>
        {item.sku && <div className="text-[10px] text-surface-400">{item.sku}</div>}
      </td>
      <td className="px-1.5 py-1.5">{numInput('pkg', item.pkg)}</td>
      <td className="px-1.5 py-1.5">{readOnly(item.mrp, 0)}</td>
      <td className="px-1.5 py-1.5">{numInput('rmPercent', item.rmPercent, 'bg-amber-50')}</td>
      <td className="px-1.5 py-1.5">{readOnly(item.gstPercent, 0)}</td>
      <td className="px-1.5 py-1.5 bg-blue-50/40">{readOnly(item.turIncl)}</td>
      <td className="px-1.5 py-1.5 bg-blue-50/40">{readOnly(item.turExcl)}</td>
      <td className={cn('px-1.5 py-1.5 bg-amber-50/40', modeHighlight('discTur'))}>
        {numInput('discPctOnTur', item.rateMode === 'DISC_TUR' ? item.discPctOnTur : item.discPctOnTur,
          item.rateMode === 'DISC_TUR' ? 'bg-amber-50 font-semibold' : 'bg-surface-50 text-surface-500')}
      </td>
      <td className={cn('px-1.5 py-1.5 bg-amber-50/40', modeHighlight('discMrp'))}>
        {numInput('discPctOnMrp', item.discPctOnMrp,
          item.rateMode === 'DISC_MRP' ? 'bg-amber-50 font-semibold' : 'bg-surface-50 text-surface-500')}
      </td>
      <td className="px-1.5 py-1.5 bg-blue-50/40">{readOnly(item.netRateExcl)}</td>
      <td className={cn('px-1.5 py-1.5 bg-green-50/40', modeHighlight('net'))}>
        {numInput('netRateIncl', item.rateMode === 'NET' ? item.netRateIncl : item.netRateIncl,
          item.rateMode === 'NET' ? 'bg-green-50 font-semibold' : 'bg-surface-50 text-surface-500')}
      </td>
      <td className="px-1.5 py-1.5">
        {numInput('cases', item.cases, 'font-semibold')}
      </td>
      <td className="px-1.5 py-1.5 bg-blue-50/40 text-right">
        <span className="text-surface-900 font-medium">
          {item.lineAmount != null
            ? '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(item.lineAmount)
            : '—'}
        </span>
      </td>
      <td className="px-1.5 py-1.5">
        <input
          type="text"
          value={item.note || ''}
          onChange={(e) => onChange('note', e.target.value)}
          placeholder="…"
          className="w-full rounded border border-surface-200 bg-white px-1.5 py-1 text-xs focus:border-bhoomi-500 focus:outline-none"
        />
      </td>
      <td className="px-1.5 py-1.5">
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ── parse PKG integer from packing string ─────────────────────────────────────
function parsePkg(packing) {
  if (!packing) return null
  const m = String(packing).match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}
