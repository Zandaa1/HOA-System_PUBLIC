import { RouteMotion } from '@/components/route-motion'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RouteMotion className="min-h-svh w-full">
      {children}
    </RouteMotion>
  )
}
