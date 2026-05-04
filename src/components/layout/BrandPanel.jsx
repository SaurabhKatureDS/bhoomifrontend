import { APP_NAME, APP_DIVISION, APP_TAGLINE, APP_CITIES } from '@/utils/constants'

/**
 * Branded side panel shown on auth pages.
 * Mirrors the reference project's left brand column pattern.
 */
export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-bhoomi-800 to-bhoomi-600 lg:flex lg:w-[42%] lg:flex-col lg:items-center lg:justify-center">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-bhoomi-500/30 blur-3xl" />
        <span className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-bhoomi-600/40 blur-3xl" />
        <span className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-10 text-center text-white">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/30 backdrop-blur-sm">
          <span className="block h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.7)]" />
        </div>

        <div className="font-display text-4xl tracking-wider">
          <span className="font-light">Bhoomi</span>
          <span className="font-bold">.Enterprises</span>
        </div>

        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-white/80">{APP_DIVISION}</p>

        <div className="my-8 h-px w-24 bg-white/30" />

        <p className="text-base font-medium text-white/95">{APP_TAGLINE}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/60">{APP_CITIES}</p>

        <p className="mt-12 text-[11px] uppercase tracking-[0.25em] text-white/50">
          {APP_NAME} &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}
