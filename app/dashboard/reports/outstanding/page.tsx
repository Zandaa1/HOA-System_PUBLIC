import { redirect } from 'next/navigation'

export default function OutstandingReportRedirectPage() {
  redirect('/dashboard/billing/collections')
}
