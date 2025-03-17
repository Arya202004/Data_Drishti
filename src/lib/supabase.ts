import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables or fallback to defaults
// NOTE: In production, these should be set as environment variables
// and NEVER committed to your repository
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

