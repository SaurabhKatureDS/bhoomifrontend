import { forwardRef } from 'react'

const BHOOMI_BLUE = '#1a3a6e'
const BHOOMI_LIGHT_BLUE = '#e8f0fe'
const WHATSAPP_NUMBER = '+91 77380 36942'

const fmt = (v, decimals = 3) =>
  v == null ? '—' : Number(v).toFixed(decimals)

const fmtDate = (d) => {
  if (!d) return '—'
  const parts = String(d).split('-')
  if (parts.length !== 3) return d
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parts[2]}-${months[parseInt(parts[1], 10) - 1]}-${parts[0]}`
}

/**
 * Rate Quote Image — rendered off-screen and captured with html-to-image.
 * forwardRef so parent can pass a ref for screenshot.
 */
const RateQuoteImage = forwardRef(function RateQuoteImage({ rate, visibleCols }, ref) {
  if (!rate) return null

  const cols = visibleCols || defaultVisibleCols(rate.items || [])

  const COL_DEFS = buildColDefs(cols)

  const items = rate.items || []
  const totalCases = items.reduce((s, i) => s + (i.cases || 0), 0)
  const totalAmount = items.reduce((s, i) => s + Number(i.lineAmount || 0), 0)

  return (
    <div
      ref={ref}
      style={{
        width: 900,
        backgroundColor: '#fff',
        fontFamily: 'Arial, sans-serif',
        padding: 0,
        border: `2px solid ${BHOOMI_BLUE}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ backgroundColor: BHOOMI_BLUE, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', letterSpacing: 1 }}>
            Bhoomi Enterprises
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6 }}>
            <div style={{ height: 1, width: 60, backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <div style={{ height: 1, width: 60, backgroundColor: 'rgba(255,255,255,0.5)' }} />
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', padding: '14px 28px', borderBottom: `1px solid #ddd`, gap: 24 }}>
        <div style={{ flex: 1 }}>
          <MetaRow label="Customer Name" value={rate.customerName} />
          <MetaRow label="PO Number" value={rate.poNumber || '—'} />
        </div>
        <div style={{ minWidth: 220, textAlign: 'right' }}>
          <MetaRow label="Quote" value={rate.quoteNumber} right />
          <MetaRow label="Date" value={fmtDate(rate.rateDate)} right />
          <MetaRow label="Valid till" value={fmtDate(rate.validTill)} right />
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: BHOOMI_BLUE }}>
            {COL_DEFS.map((c) => (
              <th key={c.key} style={{ color: '#b8d0f8', padding: '8px 10px', textAlign: c.align || 'center', fontWeight: 600, fontSize: 12 }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : BHOOMI_LIGHT_BLUE }}>
              {COL_DEFS.map((c) => (
                <td key={c.key} style={{ padding: '8px 10px', textAlign: c.align || 'center', color: '#1a1a1a', borderBottom: '1px solid #e5e7eb' }}>
                  {c.render(item)}
                </td>
              ))}
            </tr>
          ))}
          {/* Total row */}
          <tr style={{ backgroundColor: '#f0f4ff', fontWeight: 'bold' }}>
            <td colSpan={COL_DEFS.findIndex(c => c.key === 'cases')} style={{ padding: '8px 10px' }} />
            {COL_DEFS.some(c => c.key === 'cases') && (
              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold' }}>{totalCases}</td>
            )}
            {COL_DEFS.some(c => c.key === 'amount') && (
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(totalAmount)}
              </td>
            )}
            {COL_DEFS.some(c => c.key === 'note') && <td />}
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px solid #ddd' }}>
        <div style={{ fontSize: 12, color: '#444' }}>
          <div style={{ marginBottom: 4 }}>
            📱 For queries, please WhatsApp us on{' '}
            <span style={{ color: BHOOMI_BLUE, fontWeight: 'bold' }}>{WHATSAPP_NUMBER}</span>{' '}
            or speak to your relationship manager.
          </div>
          <div>
            ✉️ You can also email us at{' '}
            <span style={{ color: BHOOMI_BLUE, fontWeight: 'bold' }}>orders@bhoomient.co.in</span>
          </div>
          <div style={{ marginTop: 8, color: BHOOMI_BLUE, fontWeight: 'bold', fontSize: 13 }}>
            We look forward to your order!
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#666' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4, color: BHOOMI_BLUE }}>We deal in leading brands</div>
          <div style={{ fontSize: 10, color: '#888' }}>HUL · Marico · Nestlé · GSK · ...and many more!</div>
        </div>
      </div>
    </div>
  )
})

function MetaRow({ label, value, right }) {
  return (
    <div style={{ fontSize: 13, marginBottom: 3, textAlign: right ? 'right' : 'left' }}>
      <span style={{ color: '#666' }}>{label}: </span>
      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{value || '—'}</span>
    </div>
  )
}

function defaultVisibleCols(items) {
  // Try to read from first item's columnVisibility JSON
  if (items.length > 0 && items[0].columnVisibility) {
    try {
      return JSON.parse(items[0].columnVisibility)
    } catch { /* ignore */ }
  }
  return { product: true, pkg: true, mrp: true, gstPct: true, netRateIncl: true, cases: true, amount: true, note: false }
}

function buildColDefs(cols) {
  const defs = []

  defs.push({ key: 'product', label: 'Product', align: 'left', render: (i) => i.productName || '—' })

  if (cols.pkg !== false)
    defs.push({ key: 'pkg', label: 'PKG', render: (i) => i.pkg ?? '—' })

  if (cols.mrp !== false)
    defs.push({ key: 'mrp', label: 'MRP (₹)', render: (i) => i.mrp != null ? Number(i.mrp).toFixed(0) : '—' })

  if (cols.rmPct)
    defs.push({ key: 'rmPct', label: 'RM%', render: (i) => i.rmPercent != null ? `${Number(i.rmPercent).toFixed(1)}%` : '—' })

  if (cols.gstPct !== false)
    defs.push({ key: 'gstPct', label: 'GST%', render: (i) => i.gstPercent != null ? `${Number(i.gstPercent).toFixed(0)}%` : '—' })

  if (cols.turIncl)
    defs.push({ key: 'turIncl', label: 'TUR (incl)', render: (i) => fmt(i.turIncl) })

  if (cols.turExcl)
    defs.push({ key: 'turExcl', label: 'TUR (excl)', render: (i) => fmt(i.turExcl) })

  if (cols.discTur)
    defs.push({ key: 'discTur', label: 'Disc% TUR', render: (i) => i.discPctOnTur != null ? `${Number(i.discPctOnTur).toFixed(2)}%` : '—' })

  if (cols.discMrp)
    defs.push({ key: 'discMrp', label: 'Disc% MRP', render: (i) => i.discPctOnMrp != null ? `${Number(i.discPctOnMrp).toFixed(2)}%` : '—' })

  if (cols.netRateExcl)
    defs.push({ key: 'netRateExcl', label: 'Net Rate (excl)', render: (i) => fmt(i.netRateExcl) })

  if (cols.netRateIncl !== false)
    defs.push({ key: 'netRateIncl', label: 'Net Rate (incl. GST) (₹)', render: (i) => fmt(i.netRate) })

  if (cols.cases !== false)
    defs.push({ key: 'cases', label: 'Cases', render: (i) => i.cases ?? '—' })

  if (cols.amount !== false)
    defs.push({
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (i) =>
        i.lineAmount != null
          ? '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(Number(i.lineAmount))
          : '—',
    })

  if (cols.note)
    defs.push({ key: 'note', label: 'Note', align: 'left', render: (i) => i.note || '' })

  return defs
}

export default RateQuoteImage
