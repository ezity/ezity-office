import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { EZityLogoMark } from '@/components/brand/ezity-brand'
import { fetchHermesAuthStatus, setStoredAuthToken } from '@/lib/hermes-auth'

export function LoginScreen() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingExistingSession, setCheckingExistingSession] = useState(true)

  // Auto-login: If an active session exists (cookie or localStorage token), automatically proceed
  useEffect(() => {
    let cancelled = false
    async function checkActiveSession() {
      try {
        const status = await fetchHermesAuthStatus(3000)
        if (!cancelled && status.authenticated) {
          window.location.reload()
          return
        }
      } catch {
        // Continue to show login form
      } finally {
        if (!cancelled) setCheckingExistingSession(false)
      }
    }
    void checkActiveSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password.trim() || loading) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, rememberMe }),
      })

      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string }

      if (data.ok) {
        if (rememberMe && data.token) {
          setStoredAuthToken(data.token)
        } else if (!rememberMe) {
          setStoredAuthToken(null)
        }
        // Success! Reload to trigger verified auth
        window.location.reload()
      } else {
        setError(data.error || 'Invalid password. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Authentication failed. Please check your connection and try again.')
      setLoading(false)
    }
  }

  if (checkingExistingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14] px-4 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-xs font-medium tracking-wide text-slate-400">Verifying session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070B14] px-4">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-cyan-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-blue-600/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl ring-1 ring-white/10 sm:p-10">
          {/* Logo & Brand Header */}
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-3">
              <EZityLogoMark size="md" className="drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
              <h1 className="text-2xl font-bold tracking-tight text-white">
                EZity AI Office
              </h1>
            </div>
            <p className="text-xs font-medium tracking-wider uppercase text-cyan-400/80">
              EZity Solutions &middot; AI Workforce &amp; Operations
            </p>
          </div>

          {/* Title */}
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-slate-100">
              Enter Password
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              This workspace is protected. Please authenticate to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="workspace-password" className="mb-1.5 block text-xs font-medium text-slate-300">
                Workspace Password
              </label>
              <div className="relative">
                <input
                  id="workspace-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password..."
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="group flex cursor-pointer select-none items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-slate-700 bg-slate-950 text-cyan-500 accent-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition">
                  Remember me <span className="text-slate-500">(30 days)</span>
                </span>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-300">
                <svg className="size-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Powered by{' '}
          <a
            href="https://github.com/NousResearch/hermes-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-cyan-400 transition hover:text-cyan-300"
          >
            Hermes Agent
          </a>
        </p>
      </div>
    </div>
  )
}
