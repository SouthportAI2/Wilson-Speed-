import { createClient } from '@supabase/supabase-js';

let supabase: any = null;

// Renamed from getSupabase to getSupabaseClient to fix import errors in AudioLogger and DiagnosticsPanel
export function getSupabaseClient() {
  if (!supabase) {
    const config = localStorage.getItem('southport_config');
    if (config) {
      const { supabaseUrl, supabaseKey } = JSON.parse(config);
      if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
      }
    }
  }
  return supabase;
}

export async function fetchEmailSummaries() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');
  
  const { data, error } = await client
    .from('email_summaries')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(20);
  
  if (error) throw error;
  return data || [];
}
