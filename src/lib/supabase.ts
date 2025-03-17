
import { createClient } from '@supabase/supabase-js'

// Supabase credentials from your project
const supabaseUrl = 'https://ontbsbhtyoruxofazyrx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udGJzYmh0eW9ydXhvZmF6eXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MjA2NTMsImV4cCI6MjA1NjI5NjY1M30.vSHr3jLOOg7Sd3C6F5gfxVPXMd5Orr5YM0k2jBO5WEg'

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
