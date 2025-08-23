import { createClient } from '@supabase/supabase-js'

// These should be provided via environment variables at build time.
// For local development you can create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } })
  : null

export const isSupabaseConfigured = !!supabase


