import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.')
}

// Precisa ser lido antes do createClient, que dispara o processamento assíncrono
// do hash da URL (detectSessionInUrl) e o limpa via history.replaceState.
export const emailJustConfirmed =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.hash.slice(1)).get('type') === 'signup'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
