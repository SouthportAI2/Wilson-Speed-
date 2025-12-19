import { createClient } from '@supabase/supabase-js';

// Helper to get a fresh client based on current settings
export const getSupabaseClient = () => {
  // 1. Try LocalStorage (User Settings Override)
  const storedConfig = localStorage.getItem('southport_config');
  const config = storedConfig ? JSON.parse(storedConfig) : {};
  
  // 2. Safely check for credentials
  // We avoid import.meta.env as it crashes in non-bundled browser environments
  const supabaseUrl = config.supabaseUrl;
  const supabaseKey = config.supabaseKey;

  if (!supabaseUrl || !supabaseKey) {
    // Silent fail to allow mock state or prompt user in settings
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Supabase Initialization Error:", e);
    return null;
  }
};
