
import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = () => {
  const storedConfig = localStorage.getItem('southport_config');
  if (!storedConfig) return null;

  try {
    const config = JSON.parse(storedConfig);
    const supabaseUrl = config.supabaseUrl;
    const supabaseKey = config.supabaseKey;

    if (!supabaseUrl || !supabaseKey) return null;

    // Basic URL validation to prevent SDK crash
    if (!supabaseUrl.startsWith('http')) {
      console.warn("Invalid Supabase URL format in config.");
      return null;
    }

    return createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Supabase Initialization Protocol Failure:", e);
    return null;
  }
};
