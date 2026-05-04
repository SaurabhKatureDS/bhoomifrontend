import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react'
import { verifyTotpApi } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { BrandPanel } from '@/components/layout/BrandPanel'
import { cn } from '@/utils/helpers'
import { OTP_LENGTH, ROUTES } from '@/utils/constants'

export default function MfaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const mfaToken = location.state?.mfaToken

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    if (!mfaToken) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    inputRefs.current[0]?.focus()
  }, [mfaToken, navigate])

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return
    const val = value.slice(-1)
    const next = [...digits]
    next[index] = val
    setDigits(next)
    if (val && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIdx]?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const data = await verifyTotpApi(mfaToken, code)
      login(data)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.')
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const code = digits.join('')

  return (
    <div className="flex min-h-screen w-full bg-surface-100">
      <BrandPanel />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-12">
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <span className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-bhoomi-500/15 blur-3xl" />
          <span className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-bhoomi-300/15 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md animate-fade-in">
          <div className="rounded-2xl border border-surface-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm sm:p-10">
            <button
              type="button"
              onClick={() => navigate(ROUTES.LOGIN)}
              className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-surface-500 transition-colors hover:text-bhoomi-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </button>

            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-bhoomi-50 text-bhoomi-600">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div className="mb-8">
              <h1 className="font-display text-3xl tracking-wide text-surface-900">
                Two-Factor Auth
              </h1>
              <p className="mt-2 text-sm text-surface-500">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading}
                    autoComplete="one-time-code"
                    aria-label={`Digit ${i + 1}`}
                    className={cn(
                      'h-12 w-12 rounded-lg border bg-white/80 text-center text-xl font-semibold text-surface-900 outline-none transition-all',
                      'focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20',
                      d ? 'border-bhoomi-500' : 'border-surface-300'
                    )}
                  />
                ))}
              </div>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                loading={loading}
                disabled={code.length < OTP_LENGTH}
                className="w-full"
              >
                {!loading && (
                  <>
                    Verify &amp; Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-surface-500">
              Open your authenticator app (Google Authenticator, Authy, etc.) to get the code.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
