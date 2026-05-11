import { forwardRef } from 'react'
import hulLogo from '@/assets/brands/hul.png'
import maricoLogo from '@/assets/brands/marico.png'
import nestleLogo from '@/assets/brands/nestle.png'
import gskLogo from '@/assets/brands/gsk.png'

const BLUE       = '#1a3a6e'
const TH_BG      = '#d6e4f7'
const ROW_ALT    = '#edf3fb'
const BORDER     = '1px solid #b8cee8'
const WA_NUM     = '+91 77380 36942'
const EMAIL      = 'orders@bhoomient.co.in'
const W          = 1060   // total canvas width

const fmt = (v, d = 3) => v == null ? '—' : Number(v).toFixed(d)

const fmtDate = (d) => {
  if (!d) return '—'
  const p = String(d).split('-')
  if (p.length !== 3) return d
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${p[2]}-${M[parseInt(p[1],10)-1]}-${p[0]}`
}

/* ── inline SVG icons ─────────────────────────────────────────────────────── */
const WaIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
    <circle cx="14" cy="14" r="14" fill="#25D366"/>
    <path d="M14 6.5A7.5 7.5 0 0 0 7.44 17.6L6.5 21.5l4.02-.94A7.5 7.5 0 1 0 14 6.5zm3.63 10.4c-.16.44-.92.85-1.27.9-.32.04-.73.06-1.18-.07-.27-.08-.62-.2-1.07-.42-1.9-.82-3.13-2.74-3.23-2.87-.09-.12-.73-.97-.73-1.85 0-.88.46-1.31.63-1.49.16-.18.36-.22.47-.22h.35c.11 0 .26-.04.41.31.16.36.54 1.32.59 1.42.05.09.08.2.02.32-.06.12-.09.2-.2.32l-.3.32c-.1.09-.2.2-.09.4.11.2.5.82 1.07 1.34.74.66 1.36.87 1.55.96.2.1.31.08.43-.05.12-.13.5-.58.64-.79.13-.2.26-.16.44-.09.18.07 1.13.53 1.33.63.2.09.33.14.37.23.06.08.06.46-.11.9z" fill="#fff"/>
  </svg>
)

const MailIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
    <circle cx="14" cy="14" r="14" fill={BLUE}/>
    <rect x="7" y="9.5" width="14" height="9" rx="1" stroke="#fff" strokeWidth="1.3" fill="none"/>
    <polyline points="7,10 14,15.5 21,10" stroke="#fff" strokeWidth="1.3" fill="none"/>
  </svg>
)

/* ── component ────────────────────────────────────────────────────────────── */
const RateQuoteImage = forwardRef(function RateQuoteImage({ rate, visibleCols }, ref) {
  if (!rate) return null

  const cols    = visibleCols || defaultVisibleCols(rate.items || [])
  const COLS    = buildColDefs(cols)
  const items   = rate.items || []
  const totCases  = items.reduce((s, i) => s + (Number(i.cases)      || 0), 0)
  const totAmount = items.reduce((s, i) => s + (Number(i.lineAmount) || 0), 0)
  const ciCases   = COLS.findIndex(c => c.key === 'cases')
  const hasCases  = ciCases > -1
  const hasAmt    = COLS.some(c => c.key === 'amount')
  const hasNote   = COLS.some(c => c.key === 'note')

  return (
    <div ref={ref} style={{
      width: W,
      fontFamily: '"Arial", "Helvetica Neue", Helvetica, sans-serif',
      backgroundColor: '#fff',
      border: `2px solid ${BLUE}`,
      overflow: 'visible',   /* don't clip footer logos */
    }}>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: BLUE, padding: '22px 36px 20px' }}>
        {/* title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <Line /> <Dot />
          <span style={{ color: '#fff', fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>Bhoomi Enterprises</span>
          <Dot /> <Line />
        </div>
        {/* meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <MR label="Customer Name" value={rate.customerName} />
            {rate.poNumber && <MR label="PO Number" value={rate.poNumber} />}
          </div>
          <div style={{ textAlign: 'right' }}>
            {rate.quoteNumber && <MR label="Quote" value={rate.quoteNumber} right />}
            <MR label="Date"       value={fmtDate(rate.rateDate)} right />
            <MR label="Valid till" value={fmtDate(rate.validTill)} right />
          </div>
        </div>
      </div>

      {/* ── TABLE ────────────────────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ backgroundColor: TH_BG }}>
            {COLS.map(c => (
              <th key={c.key} style={{
                color: BLUE, fontWeight: 700, fontSize: 13,
                padding: '11px 13px', textAlign: c.align || 'center', border: BORDER,
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : ROW_ALT }}>
              {COLS.map(c => (
                <td key={c.key} style={{
                  padding: '9px 13px', textAlign: c.align || 'center',
                  color: '#111', border: BORDER, fontSize: 13.5,
                }}>
                  {c.render(item)}
                </td>
              ))}
            </tr>
          ))}
          {/* totals */}
          {(hasCases || hasAmt) && (
            <tr style={{ backgroundColor: TH_BG }}>
              <td colSpan={hasCases ? ciCases : COLS.length}
                style={{ padding: '9px 13px', border: BORDER, textAlign: 'right',
                         color: BLUE, fontWeight: 700, fontSize: 13 }}>
                Total
              </td>
              {hasCases && (
                <td style={{ padding: '9px 13px', textAlign: 'center', border: BORDER,
                             color: BLUE, fontWeight: 700, fontSize: 13 }}>
                  {totCases}
                </td>
              )}
              {hasAmt && (
                <td style={{ padding: '9px 13px', textAlign: 'right', border: BORDER,
                             color: BLUE, fontWeight: 700, fontSize: 13 }}>
                  ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(totAmount)}
                </td>
              )}
              {hasNote && <td style={{ border: BORDER }} />}
            </tr>
          )}
        </tbody>
      </table>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderTop: `2px solid ${BLUE}`, backgroundColor: '#fff' }}>

        {/* left: contact */}
        <div style={{ flex: '1 1 0', padding: '18px 28px 16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 12 }}>
            <WaIcon />
            <span style={{ fontSize: 13, color: '#222', lineHeight: 1.6 }}>
              For queries, please whatsapp us on{' '}
              <strong style={{ color: BLUE }}>{WA_NUM}</strong>
              {' '}or speak to your relationship manager.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
            <MailIcon />
            <span style={{ fontSize: 13, color: '#222' }}>
              You can also email us at{' '}
              <strong style={{ color: BLUE }}>{EMAIL}</strong>
            </span>
          </div>
          <div style={{ borderTop: '1px solid #d8e4f0', paddingTop: 12 }}>
            <strong style={{ color: BLUE, fontSize: 14.5 }}>We look forward to your order.</strong>
          </div>
        </div>

        {/* divider */}
        <div style={{ width: 1, backgroundColor: '#d0dcea', margin: '14px 0' }} />

        {/* right: brands — fixed pixel width wide enough for 4 logos */}
        <div style={{
          width: 420, flexShrink: 0,
          padding: '18px 22px 16px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14,
        }}>
          <div style={{
            backgroundColor: BLUE, color: '#fff',
            fontWeight: 700, fontSize: 13, letterSpacing: 0.3,
            padding: '7px 24px', borderRadius: 22, whiteSpace: 'nowrap',
          }}>
            We deal in leading brands
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <img src={hulLogo}    alt="HUL"    style={{ width: 72,  height: 52, objectFit: 'contain', display: 'block' }} />
            <img src={maricoLogo} alt="Marico" style={{ width: 70,  height: 44, objectFit: 'contain', display: 'block' }} />
            <img src={nestleLogo} alt="Nestlé" style={{ width: 72,  height: 52, objectFit: 'contain', display: 'block' }} />
            <img src={gskLogo}    alt="GSK"    style={{ width: 70,  height: 52, objectFit: 'contain', display: 'block' }} />
          </div>
          <span style={{ fontSize: 12.5, color: '#555', fontWeight: 600 }}>...and many more!</span>
        </div>
      </div>
    </div>
  )
})

/* ── tiny helpers ─────────────────────────────────────────────────────────── */
const Line = () => <div style={{ height: 2, width: 56, backgroundColor: 'rgba(255,255,255,0.4)' }} />
const Dot  = () => <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.7)' }} />

function MR({ label, value, right }) {
  return (
    <div style={{
      fontSize: 14, marginBottom: 6,
      display: 'flex', alignItems: 'baseline', gap: 8,
      justifyContent: right ? 'flex-end' : 'flex-start',
    }}>
      <strong style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: 0.2 }}>{label}</strong>
      <span   style={{ color: 'rgba(255,255,255,0.5)' }}>:</span>
      <span   style={{ color: '#fff', fontWeight: 400 }}>{value || '—'}</span>
    </div>
  )
}

function defaultVisibleCols(items) {
  if (items.length > 0 && items[0].columnVisibility) {
    try { return JSON.parse(items[0].columnVisibility) } catch { /**/ }
  }
  return { product: true, pkg: true, mrp: true, gstPct: true, netRateIncl: true, cases: true, amount: true, note: false }
}

function buildColDefs(cols) {
  const d = []
  d.push({ key: 'product',     label: 'Product',                  align: 'left',  render: i => i.productName || '—' })
  if (cols.pkg       !== false) d.push({ key: 'pkg',      label: 'PKG',              render: i => i.pkg ?? '—' })
  if (cols.mrp       !== false) d.push({ key: 'mrp',      label: 'MRP (₹)',          render: i => i.mrp != null ? Number(i.mrp).toFixed(0) : '—' })
  if (cols.rmPct)               d.push({ key: 'rmPct',    label: 'RM%',              render: i => i.rmPercent != null ? `${Number(i.rmPercent).toFixed(1)}%` : '—' })
  if (cols.gstPct    !== false) d.push({ key: 'gstPct',   label: 'GST%',             render: i => i.gstPercent != null ? `${Number(i.gstPercent).toFixed(0)}%` : '—' })
  if (cols.turIncl)             d.push({ key: 'turIncl',  label: 'TUR (incl)',       render: i => fmt(i.turIncl) })
  if (cols.turExcl)             d.push({ key: 'turExcl',  label: 'TUR (excl)',       render: i => fmt(i.turExcl) })
  if (cols.discTur)             d.push({ key: 'discTur',  label: 'Disc% TUR',        render: i => i.discPctOnTur != null ? `${Number(i.discPctOnTur).toFixed(2)}%` : '—' })
  if (cols.discMrp)             d.push({ key: 'discMrp',  label: 'Disc% MRP',        render: i => i.discPctOnMrp != null ? `${Number(i.discPctOnMrp).toFixed(2)}%` : '—' })
  if (cols.netRateExcl)         d.push({ key: 'netRateExcl', label: 'Net Rate (excl)', render: i => fmt(i.netRateExcl) })
  if (cols.netRateIncl !== false) d.push({ key: 'netRateIncl', label: 'Net Rate (incl. GST) (₹)', render: i => fmt(i.netRate) })
  if (cols.cases      !== false) d.push({ key: 'cases',   label: 'Cases',            render: i => i.cases ?? '—' })
  if (cols.amount     !== false) d.push({
    key: 'amount', label: 'Amount', align: 'right',
    render: i => i.lineAmount != null
      ? '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(Number(i.lineAmount))
      : '—',
  })
  if (cols.note) d.push({ key: 'note', label: 'Note', align: 'left', render: i => i.note || '' })
  return d
}

export default RateQuoteImage
