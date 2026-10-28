
import { createClient } from '@/lib/supabase/server'
import { ContactsForm } from './contacts-form'
import { PageHeader } from "@/components/ui/page-header"

export default async function DirectoryContactsPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .order('setting_key')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Important Contacts"
        description="Manage the contact numbers shown in the resident portal directory."
      />

      <ContactsForm settings={settings || []} />
    </div>
  )
}
