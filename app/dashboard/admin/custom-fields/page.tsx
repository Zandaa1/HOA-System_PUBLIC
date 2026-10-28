import { redirect } from 'next/navigation'

export default function CustomFieldsRedirectPage() {
  redirect('/dashboard/settings')
}
