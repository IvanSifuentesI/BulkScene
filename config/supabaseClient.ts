
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pvcjahzwnhbfajmrtzmg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2Y2phaHp3bmhiZmFqbXJ0em1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzczMjcsImV4cCI6MjA3OTkxMzMyN30.CC1eQeK-xP35EDiOT7T5fh3IIbdL63iKQL2O8WEOW0U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (...args) => fetch(...args)
  }
});
