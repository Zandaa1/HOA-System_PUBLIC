
import { redirect } from 'next/navigation'
import { requireModule } from '@/lib/check-module'

export default async function DisbursementsRedirect() {
  await requireModule('enable_disbursements')
  redirect('/dashboard/finance/disbursements')
}
