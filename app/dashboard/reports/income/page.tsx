import { redirect } from 'next/navigation'

export default function IncomeReportRedirectPage() {
  redirect('/dashboard/billing/collections')
}
