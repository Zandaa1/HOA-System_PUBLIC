import { createClient } from '@/lib/supabase/server'
import { isModuleEnabled } from '@/lib/modules'
import { redirect } from 'next/navigation'

/**
 * Checks if a module is enabled. Redirects to dashboard if disabled.
 * Call at the top of server component pages for toggleable modules.
 */
export async function requireModule(moduleKey: string) {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
  const enabled = isModuleEnabled(settings || [], moduleKey)
  if (!enabled) {
    redirect('/dashboard')
  }
}

/**
 * Checks if a module is enabled (without redirect). Returns boolean.
 */
export async function checkModule(moduleKey: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
  return isModuleEnabled(settings || [], moduleKey)
}
