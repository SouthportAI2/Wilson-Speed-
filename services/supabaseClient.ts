import { createClient } from '@supabase/supabase-js';

// Helper to get a fresh client based on current settings
export const getSupabaseClient = () => {
  // 1. Try LocalStorage (User Settings Override)
  const storedConfig = localStorage.getItem('southport_config');
  const config = storedConfig ? JSON.parse(storedConfig) : {};
  
  // 2. Try Environment Variables (Vercel/Vite standard)
  const supabaseUrl = config.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = config.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not found in settings or environment variables");
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};
