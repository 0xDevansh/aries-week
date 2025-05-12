import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { createClient as createServerSideClient } from '@/lib/supabase/server'

// Re-export the clients
export { createClient as createBrowserClient } from '@/lib/supabase/client'
export { createClient as createServerClient } from '@/lib/supabase/server'

// For backwards compatibility
export const supabase = createBrowserClient() 