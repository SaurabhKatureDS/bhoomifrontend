import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { getChallanPrintPreview } from '@/api/challans'
import { Spinner } from '@/components/ui/Spinner'

const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : ''
const fmtNum = (v, dec = 0) => v == null ? '' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const fmtAmt = (v) => v == null ? '' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n) {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
}

function toWords(n) {
  n = Math.round(n)
  if (n === 0) return 'Zero'
  let parts = []
  if (n >= 10000000) { parts.push(twoDigits(Math.floor(n / 10000000)) + ' Crore'); n %= 10000000 }
  if (n >= 100000)   { parts.push(twoDigits(Math.floor(n / 100000)) + ' Lakh'); n %= 100000 }
  if (n >= 1000)     { parts.push(twoDigits(Math.floor(n / 1000)) + ' Thousand'); n %= 1000 }
  if (n >= 100)      { parts.push(ONES[Math.floor(n / 100)] + ' Hundred'); n %= 100 }
  if (n > 0)         { parts.push(twoDigits(n)) }
  return parts.join(' ')
}

export default function ChallanPrintView() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const printRef = useRef(null)

  useEffect(() => {
    getChallanPrintPreview(id).then(d => {
      setData(d)
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [id])

  const handlePrint = () => window.print()

  const handleDownloadPdf = useCallback(async () => {
    if (!printRef.current) return
    setDownloading(true)
    try {
      // Capture the challan content as a high-res PNG
      const dataUrl = await toPng(printRef.current, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        style: {
          margin: '0',
          boxShadow: 'none',
          transform: 'none',
        }
      })

      // Build a minimal single-page A4 PDF containing the image
      const img = new Image()
      img.src = dataUrl
      await new Promise(r => { img.onload = r })

      // A4 at 72dpi: 595 x 842 pt
      const pW = 595, pH = 842
      const scale = Math.min(pW / img.naturalWidth, pH / img.naturalHeight)
      const iW = Math.round(img.naturalWidth * scale)
      const iH = Math.round(img.naturalHeight * scale)

      // Encode PNG bytes into a PDF stream via a hidden canvas
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.95)
      const base64 = jpegUrl.split(',')[1]
      const raw = atob(base64)
      const bytes = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

      // Minimal PDF structure
      const nl = '\n'
      const obj = (n, s) => `${n} 0 obj${nl}${s}${nl}endobj${nl}`
      const imgStream = bytes
      let offsets = []
      let body = `%PDF-1.4${nl}`

      const addObj = (content, isBinary = false) => {
        const n = offsets.length + 1
        offsets.push(body.length)
        if (isBinary) {
          body += `${n} 0 obj\n`
          // we'll handle binary separately
        } else {
          body += obj(n, content)
        }
        return n
      }

      // Simpler approach: build the PDF text, append binary at end
      const catalog = `<< /Type /Catalog /Pages 2 0 R >>`
      const pages  = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`
      const page   = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pW} ${pH}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>`
      const stream = `BT ET\nq ${iW} 0 0 ${iH} ${Math.round((pW - iW) / 2)} ${Math.round((pH - iH) / 2)} cm /Im1 Do Q`
      const streamContent = `<< /Length ${stream.length} >>${nl}stream${nl}${stream}${nl}endstream`
      const imgDict = `<< /Type /XObject /Subtype /Image /Width ${img.naturalWidth} /Height ${img.naturalHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgStream.length} >>`

      const offArr = []
      let pdf = '%PDF-1.4\n'
      const push = (s) => { offArr.push(pdf.length); pdf += s + '\n' }

      push(`1 0 obj\n${catalog}\nendobj`)
      push(`2 0 obj\n${pages}\nendobj`)
      push(`3 0 obj\n${page}\nendobj`)
      push(`4 0 obj\n${streamContent}\nendobj`)
      const imgObjOff = pdf.length
      offArr.push(imgObjOff)
      const imgObjHeader = `5 0 obj\n${imgDict}\nstream\n`
      const imgObjFooter = `\nendstream\nendobj\n`

      const xrefOffset = pdf.length + imgObjHeader.length + imgStream.length + imgObjFooter.length

      // Encode as bytes
      const enc = new TextEncoder()
      const pdfStart = enc.encode(pdf)
      const headerBytes = enc.encode(imgObjHeader)
      const footerBytes = enc.encode(imgObjFooter)

      const xrefSection = `xref\n0 6\n0000000000 65535 f \n` +
        offArr.map(o => String(o).padStart(10, '0') + ' 00000 n ').join('\n') + '\n'
      const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
      const xrefBytes = enc.encode(xrefSection + trailer)

      const blob = new Blob([pdfStart, headerBytes, imgStream, footerBytes, xrefBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${data?.challanNumber || 'challan'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download failed', err)
      alert('PDF download failed. Use Print → Save as PDF instead.')
    } finally {
      setDownloading(false)
    }
  }, [data])

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
  if (!data) return <div className="p-8 text-center text-red-600">Failed to load challan.</div>

  const items = data.items || []
  const totalCases = items.reduce((s, i) => s + (Number(i.cases) || 0), 0)
  const totalAmount = Number(data.totalAmount) || items.reduce((s, i) => s + (Number(i.lineAmount) || 0), 0)
  const amountInWords = toWords(totalAmount) + ' Only'

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', background: '#f3f4f6', minHeight: '100vh' }}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; background: #fff; }
          .no-print { display: none !important; }
          .print-bg { background: #fff !important; min-height: unset !important; padding: 0 !important; }
          .print-wrapper { box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: none !important; width: 100% !important; background: transparent !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; padding: 15mm 18mm !important; max-width: none !important; width: 100% !important; }
        }
        table { border-collapse: collapse; width: 100%; }
        .info-table td { padding: 4px 8px; vertical-align: top; }
        .items-table th, .items-table td { border: 1px solid #000; padding: 6px 8px; }
        .items-table th { font-weight: bold; text-align: center; background: #fff; }
      `}</style>

      {/* ── Toolbar (hidden on print) ── */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#1e293b', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', gap: 12,
      }}>
        <button
          onClick={() => window.close()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}
        >
          ← Close
        </button>
        <span style={{ fontWeight: 600, fontSize: 14, opacity: 0.9 }}>
          {data.challanNumber} — Print Preview
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 6, background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            🖨 Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 6, background: downloading ? '#6b7280' : '#10b981', border: 'none', color: '#fff', cursor: downloading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {downloading ? '⏳ Generating…' : '⬇ Download PDF'}
          </button>
        </div>
      </div>

      {/* ── Page preview wrapper ── */}
      <div className="print-bg" style={{ padding: '32px 24px', display: 'flex', justifyContent: 'center' }}>
        <div
          className="print-wrapper"
          style={{
            background: '#fff',
            maxWidth: 794,
            width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div
            ref={printRef}
            className="print-page"
            style={{
              background: '#fff',
              width: '100%',
              padding: '32px 40px',
              color: '#000',
              margin: 0,
            }}
          >
          {/* Company Header */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>DELIVERY CHALLAN</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '2px' }}>BHOOMI ENTERPRISES</div>
            <div style={{ fontSize: '11px', marginTop: '4px', color: '#333' }}>
              Khetani Industrial Area, Gala No.6, M.N Road,<br />
              Sonapur Lane, Kurla (W), Mumbai 400070.
            </div>
          </div>

          <hr style={{ borderTop: '1px solid #000', margin: '8px 0' }} />

          {/* Customer & Challan Info */}
          <table className="info-table" style={{ marginBottom: '12px' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <span style={{ fontWeight: 'bold' }}>Customer Name</span>
                  <span style={{ margin: '0 6px' }}>:</span>
                  <span>{data.customerName}</span>
                </td>
                <td style={{ width: '50%' }}>
                  <span style={{ fontWeight: 'bold' }}>Challan No</span>
                  <span style={{ margin: '0 6px' }}>:</span>
                  <span>{data.challanNumber}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span style={{ fontWeight: 'bold' }}>PO Number</span>
                  <span style={{ margin: '0 6px' }}>:</span>
                  <span>{data.notes || data.clusterSnapshot || '—'}</span>
                </td>
                <td>
                  <span style={{ fontWeight: 'bold' }}>Date</span>
                  <span style={{ margin: '0 6px' }}>:</span>
                  <span>{fmtDate(data.challanDate)}</span>
                </td>
              </tr>
              {data.locationName && (
                <tr>
                  <td colSpan={2}>
                    <span style={{ fontWeight: 'bold' }}>Location</span>
                    <span style={{ margin: '0 6px' }}>:</span>
                    <span>{data.locationName}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Items Table */}
          <table className="items-table" style={{ marginBottom: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Sr. No.</th>
                <th style={{ textAlign: 'left' }}>Product</th>
                <th style={{ width: '50px' }}>PKG</th>
                <th style={{ width: '55px' }}>MRP</th>
                <th style={{ width: '75px' }}>Net Rate</th>
                <th style={{ width: '55px' }}>Cases</th>
                <th style={{ width: '75px' }}>Amount</th>
                <th style={{ width: '60px' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td>{item.productName}</td>
                  <td style={{ textAlign: 'center' }}>{item.packing}</td>
                  <td style={{ textAlign: 'center' }}>{item.mrp != null ? fmtNum(item.mrp, 0) : ''}</td>
                  <td style={{ textAlign: 'center' }}>{item.netRate != null ? fmtNum(item.netRate, 3) : ''}</td>
                  <td style={{ textAlign: 'center' }}>{item.cases}</td>
                  <td style={{ textAlign: 'right' }}>{item.lineAmount != null ? fmtAmt(item.lineAmount) : ''}</td>
                  <td>{item.note || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>TOTAL</td>
                <td style={{ border: '1px solid #000' }}></td>
                <td style={{ border: '1px solid #000' }}></td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>{totalCases}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>{fmtAmt(totalAmount)}</td>
                <td style={{ border: '1px solid #000' }}></td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in Words */}
          <div style={{ border: '1px solid #000', padding: '6px 10px', marginBottom: '16px', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>Total Amount (in words):</span>{' '}
            <span>{amountInWords}</span>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', marginTop: '8px' }}>
            THIS IS NOT A TAX INVOICE
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
