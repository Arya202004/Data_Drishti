import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables or fallback to defaults
// NOTE: In production, these should be set as environment variables
// and NEVER committed to your repository
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lhsyxlfdzhpmxlndihqm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoc3l4bGZkemhwbXhsbmRpaHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1MzMwNTAsImV4cCI6MjA1NzEwOTA1MH0.OETHuoUSlVID67bsoZgbjV2giOhNrS-Ou4C5JQMHpXw'

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

