import finalLogo from '@/assets/Final.png'

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
        <img src={finalLogo} alt="Bhoomi Enterprises" className="mb-6 h-20 w-auto object-contain drop-shadow-lg" />
        <div className="font-display text-3xl font-semibold tracking-wide">
          Bhoomi Enterprises
        </div>
      </div>
    </aside>
  )
}
