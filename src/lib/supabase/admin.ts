/** SERVER-ONLY. NEVER import from Client Components or Server Actions. Restricted to webhook Route Handlers and trusted server contexts. */
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only, never NEXT_PUBLIC_
  )
}
