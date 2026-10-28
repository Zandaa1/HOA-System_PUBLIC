// Explicitly local-only bootstrap. Supply your own local service key and password.
import { createClient } from '@supabase/supabase-js'
const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const url = new URL(endpoint)
if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
  throw new Error('Demo bootstrap only accepts a local HTTP Supabase endpoint.')
}
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_ADMIN_PASSWORD
if (!key || !password || password.length < 12) {
  throw new Error('Set your local SUPABASE_SERVICE_ROLE_KEY and DEMO_ADMIN_PASSWORD (12+ characters).')
}
const client = createClient(endpoint, key, { auth: { persistSession: false } })
const email = 'admin@example.test'
const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true })
if (error) throw error
const { error: staffError } = await client.from('staff').insert({
  user_id: data.user.id, employee_id: 'DEMO-ADMIN', first_name: 'Demo', last_name: 'Administrator',
  email, position: 'Administrator', is_active: true, permissions: { all: true },
})
if (staffError) {
  await client.auth.admin.deleteUser(data.user.id)
  throw staffError
}
console.log('Local demo administrator created. Sign in with your supplied password.')
