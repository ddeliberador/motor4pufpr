/**
 * Safe Supabase client wrapper that handles missing env vars gracefully.
 * Falls back to the known project URL if VITE_SUPABASE_URL is not available.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const FALLBACK_URL = 'https://jtoeinerhvxxgoeicrif.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0b2VpbmVyaHZ4eGdvZWljcmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDc3MzEsImV4cCI6MjA4NzE4MzczMX0.YSFNqKe_eqFAxJpF_6oJoJ_ZhJD_tvHdU7boIz50h7E';

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const safeSupabase: SupabaseClient<Database> = createClient<Database>(url, key, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
