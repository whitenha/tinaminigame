import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env.local file.');
}

// Client for public access (browser safe)
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Helper function to get the service role client (only use in server environments like API routes!)
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Supabase Service Role Key is missing.');
  }
  return createClient(supabaseUrl || '', serviceKey);
};
