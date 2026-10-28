
'use client'

import { getErrorMessage } from '@/lib/utils'

import { createClient } from '@/lib/supabase/client'
import { getBranding, DEFAULT_BRANDING } from '@/lib/branding'
import type { Branding } from '@/lib/branding'
import type { LoginErrorStage } from '@/lib/login-error-logging'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect, useRef } from 'react'
import { Building2, ArrowRight, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

function serializeLoginError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>
    return {
      name: typeof errorObj.name === 'string' ? errorObj.name : undefined,
      message: typeof errorObj.message === 'string' ? errorObj.message : undefined,
      stack: typeof errorObj.stack === 'string' ? errorObj.stack : undefined,
      code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
    }
  }

  return { message: String(error || 'Unknown error') }
}

function isFailedFetchError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
    return true
  }

  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message
    return typeof message === 'string' && message.toLowerCase().includes('failed to fetch')
  }

  return false
}

function getLoginErrorMessage(error: unknown): string {
  if (isFailedFetchError(error)) {
    return 'Cannot reach the login server. Please check your internet/DNS connection or contact admin.'
  }

  return getErrorMessage(error)
}

async function reportLoginError(
  stage: LoginErrorStage,
  email: string,
  error: unknown,
  startedAt: number
) {
  if (typeof window === 'undefined') return

  try {
    await fetch('/api/login-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        stage,
        email,
        supabaseUrl,
        appUrl: window.location.href,
        elapsedMs: performance.now() - startedAt,
        timestamp: new Date().toISOString(),
        error: serializeLoginError(error),
        client: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          onLine: navigator.onLine,
        },
      }),
    })
  } catch {
    // Login error reporting should never create a second user-facing error.
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setIsHydrated(true)
    if (videoRef.current) videoRef.current.playbackRate = 0.5
    const handler = (e: Event) => {
      // Do not show the promo banner for desktop users
      const isMobileOrTablet = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) || window.matchMedia('(max-width: 1024px)').matches;
      if (!isMobileOrTablet) return;

      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBtn(true)
    }

    const installHandler = () => {
      setDeferredPrompt(null)
      setShowInstallBtn(false)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installHandler)
    }
  }, [])

  useEffect(() => {
    const fetchBranding = async () => {
      const startedAt = performance.now()
      try {
        const supabase = createClient()
        const { data: settings, error } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
        if (error && isFailedFetchError(error)) {
          await reportLoginError('branding', email, error, startedAt)
        }
        if (settings) {
          setBranding(getBranding(settings))
        }
      } catch (error) {
        if (isFailedFetchError(error)) {
          await reportLoginError('branding', email, error, startedAt)
        }
      }
    }
    fetchBranding()

  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallBtn(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const signInStartedAt = performance.now()
      let signInResult
      try {
        signInResult = await supabase.auth.signInWithPassword({
          email,
          password,
        })
      } catch (error) {
        await reportLoginError('signInWithPassword', email, error, signInStartedAt)
        throw error
      }

      const { data: { user }, error: signInError } = signInResult
      if (signInError) {
        await reportLoginError('signInWithPassword', email, signInError, signInStartedAt)
        throw signInError
      }
      if (!user) throw new Error('No user returned')

      // Query staff table to verify if the user is a staff member
      const staffLookupStartedAt = performance.now()
      let staffLookupResult
      try {
        staffLookupResult = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
      } catch (error) {
        await reportLoginError('staffLookup', email, error, staffLookupStartedAt)
        throw error
      }

      const { data: staffData, error: staffLookupError } = staffLookupResult
      if (staffLookupError) {
        await reportLoginError('staffLookup', email, staffLookupError, staffLookupStartedAt)
        throw staffLookupError
      }

      const isStaff = !!staffData

      // Keep user metadata in sync with staff status so middleware redirects correctly
      if (user.user_metadata?.is_staff !== isStaff) {
        const updateMetadataStartedAt = performance.now()
        let updateUserError
        try {
          const updateUserResult = await supabase.auth.updateUser({
            data: { is_staff: isStaff }
          })
          updateUserError = updateUserResult.error
        } catch (error) {
          await reportLoginError('updateUserMetadata', email, error, updateMetadataStartedAt)
        }
        if (updateUserError) {
          await reportLoginError('updateUserMetadata', email, updateUserError, updateMetadataStartedAt)
        }
      }

      // Full page navigation required to avoid Next.js RSC rendering and redirect loop bugs
      // We always send staff to /dashboard which handles setup and password-reset routing on the server
      window.location.href = isStaff ? '/dashboard' : '/portal'
    } catch (error: unknown) {
      setError(getLoginErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col lg:flex-row bg-background">
      {/* Form Side */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-[45%] xl:w-[40%] 2xl:w-[35%] lg:px-16 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-700 motion-safe:fill-mode-both">
        <div className="mx-auto w-full max-w-sm flex flex-col gap-8">
          
          <div className="flex items-center gap-3 text-foreground">
            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Building2 className="size-5" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="font-bold text-lg tracking-tight text-primary">{branding.hoaName}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Management Platform</span>
            </div>
          </div>

          {showInstallBtn && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Smartphone className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Install {branding.hoaName}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Install SVHOA on your home screen for quick launch and smoother mobile access.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowInstallBtn(false)}
                  className="text-xs font-semibold h-8"
                >
                  Later
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleInstallClick}
                  className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-8"
                >
                  Install Now
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sign in to your account
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter your credentials below to access your portal or dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5" data-hydrated={isHydrated}>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 transition-[border-color,box-shadow,background-color] duration-200 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 transition-[border-color,box-shadow,background-color] duration-200 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
            
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200">
                <p className="text-[13px] font-medium text-destructive">{error}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="mt-2 h-11 w-full font-semibold group transition-colors duration-200 bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-1" 
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : (
                <>
                  Sign In
                  <ArrowRight className="ml-1 size-4 opacity-70 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground leading-normal">
            Need access? <span className="text-foreground font-medium">Contact your subdivision administration office.</span>
          </p>


        </div>
      </div>

      {/* Video Side */}
      <div className="relative hidden w-full lg:block lg:flex-1 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000 motion-safe:fill-mode-both motion-safe:delay-150">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          poster="/images/login-bg.png"
          className="absolute inset-0 z-0 h-full w-full object-cover"
        >
          <source src="/videos/login-bg.mp4" type="video/mp4" />
        </video>
        {/* Institutional dark overlay with slight brand hue */}
        <div className="absolute inset-0 z-10 bg-zinc-950/65 backdrop-blur-[1px]" />
        
        {/* Content over image */}
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center p-16 text-center gap-4 motion-safe:animate-in motion-safe:slide-in-from-bottom-8 motion-safe:fade-in motion-safe:duration-1000 motion-safe:delay-300 motion-safe:fill-mode-both">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/50">Welcome to</p>
          <h2 className="text-4xl font-bold tracking-tight text-white lg:text-5xl leading-tight font-sans">
            {branding.hoaFullName}
          </h2>
        </div>
      </div>
    </div>
  )
}
