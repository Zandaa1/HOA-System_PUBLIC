
import { PrintableCredentials } from '@/components/printable-credentials'

export default async function PrintCredentialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ residentId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { residentId } = await params
  const sParams = await searchParams

  const firstName = sParams.firstName as string || 'Resident'
  const lastName = sParams.lastName as string || ''
  const email = sParams.email as string || ''
  const tempPassword = sParams.tempPassword as string || ''
  const residentType = sParams.residentType as string || 'homeowner'
  const block = sParams.block as string || ''
  const lot = sParams.lot as string || ''

  // In production, you might want to use a site setting or environment variable
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/login` 
    : 'https://example.invalid/auth/login'

  return (
    <PrintableCredentials
      resident={{
        first_name: firstName,
        last_name: lastName,
        email,
        tempPassword,
        resident_type: residentType,
      }}
      property={{ block, lot }}
      portalUrl={portalUrl}
      autoPrint={true}
    />
  )
}
