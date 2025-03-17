
import { createClient } from '@supabase/supabase-js'

// Supabase credentials from your project
const supabaseUrl = 'https://xufephmnotjgmqygfyfs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZmVwaG1ub3RqZ21xeWdmeWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMzIxNzUsImV4cCI6MjA1NzgwODE3NX0.8qucfQRJlfYAHkOr9Tz7SwNnciiR9EI2RBcs7zp81dc'

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
