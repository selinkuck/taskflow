import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://agpbmdepkdrjomnnyaov.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncGJtZGVwa2Ryam9tbm55YW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NzM0NzMsImV4cCI6MjA5MjQ0OTQ3M30.nVygpZ88roFWlTfnvFNl2OLsEETi-5qIMO1XXAvRW5s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)