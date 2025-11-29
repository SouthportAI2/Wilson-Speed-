import { createClient } from '@supabase/supabase-js';

// Helper to get a fresh client based on current settings
export const getSupabaseClient = () => {
  const storedConfig = localStorage.getItem('southport_config');
  const config = storedConfig ? JSON.parse(storedConfig) : {};
  
  const supabaseUrl = config.supabaseUrl;
  const supabaseKey = config.supabaseKey;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not found in settings");
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};
