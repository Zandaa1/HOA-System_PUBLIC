import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/server'
import { getBranding, DEFAULT_BRANDING } from '@/lib/branding'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
  const branding = getBranding(settings || [])

  return {
    title: `${branding.hoaName} - Homeowners Association Management System`,
    description: `Comprehensive management system for ${branding.hoaFullName}`,
    manifest: '/manifest.json',
    icons: {
      icon: [
        {
          url: branding.hoaFaviconUrl,
        },
      ],
      apple: '/apple-icon.png',
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('SW registered:', reg.scope);
                    },
                    function(err) {
                      console.log('SW registration failed:', err);
                    }
                  );
                });
              }
            `
          }}
        />
      </body>
    </html>
  )
}

