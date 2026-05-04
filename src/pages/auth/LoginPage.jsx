import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { loginApi } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BrandPanel } from '@/components/layout/BrandPanel'
import { ROUTES } from '@/utils/constants'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginApi(email, password)
      if (data.mfaRequired) {
        navigate(ROUTES.MFA, { state: { mfaToken: data.mfaToken } })
      } else {
        login(data)
        navigate(ROUTES.DASHBOARD)
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F5F0E8]">
      <BrandPanel />

      {/* Right form panel */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#F5F0E8] px-4 py-10 sm:px-6 lg:px-12">
        {/* Background decoration (mobile) */}
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <span className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-[#3D6FD4]/15 blur-3xl" />
          <span className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-[#1B2C5E]/15 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md animate-fade-in">
          <div className="rounded-2xl border border-surface-200 bg-white p-8 shadow-xl backdrop-blur-sm sm:p-10">
            {/* Mobile branding */}
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#3D6FD4]">
                <span className="block h-3 w-3 rounded-full bg-white" />
              </div>
              <div className="font-display text-2xl tracking-wider text-surface-900">
                <span className="font-light">Bhoomi</span>
                <span className="font-bold">.Enterprises</span>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="font-display text-3xl tracking-wide text-surface-900">Welcome back</h1>
              <p className="mt-2 text-sm text-surface-500">Sign in to access the portal</p>
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

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Input
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@bhoomient.co.in"
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
                required
                disabled={loading}
                className="border-[#3D6FD4]/40 focus:border-[#3D6FD4] focus:ring-[#3D6FD4]/20"
              />

              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                icon={<Lock className="h-4 w-4" />}
                className="border-[#3D6FD4]/40 focus:border-[#3D6FD4] focus:ring-[#3D6FD4]/20"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                    className="pointer-events-auto cursor-pointer text-surface-400 hover:text-surface-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                required
                disabled={loading}
              />

              <Button
                type="submit"
                variant="gold"
                size="lg"
                loading={loading}
                disabled={!email || !password}
                className="w-full bg-[#3D6FD4] hover:bg-[#2A4080] focus-visible:ring-[#3D6FD4]"
              >
                {!loading && (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-[#1B2C5E]/60">
              Bhoomi Enterprises &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
