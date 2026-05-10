import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
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
  const printedRef = useRef(false)

  useEffect(() => {
    getChallanPrintPreview(id).then(d => {
      setData(d)
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (data && !printedRef.current) {
      printedRef.current = true
      setTimeout(() => window.print(), 300)
    }
  }, [data])

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
  if (!data) return <div className="p-8 text-center text-red-600">Failed to load challan.</div>

  const items = data.items || []
  const totalCases = items.reduce((s, i) => s + (Number(i.cases) || 0), 0)
  const totalAmount = Number(data.totalAmount) || items.reduce((s, i) => s + (Number(i.lineAmount) || 0), 0)
  const amountInWords = toWords(totalAmount) + ' Only'

  return (
    <div className="print-page bg-white text-black" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { margin: 0; }
          .no-print { display: none !important; }
          .print-page { padding: 0; max-width: none; }
        }
        table { border-collapse: collapse; width: 100%; }
        .info-table td { padding: 4px 8px; vertical-align: top; }
        .items-table th, .items-table td { border: 1px solid #000; padding: 6px 8px; }
        .items-table th { font-weight: bold; text-align: center; background: #fff; }
      `}</style>

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
              <td></td>
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
  )
}
