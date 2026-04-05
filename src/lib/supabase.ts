import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackAnonKey = 'placeholder-anon-key';

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : fallbackUrl,
  isSupabaseConfigured ? supabaseAnonKey! : fallbackAnonKey,
  {
    auth: {
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  }
);
