
import { createClient } from '@supabase/supabase-js'

// Supabase credentials from your project
const supabaseUrl =  import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
