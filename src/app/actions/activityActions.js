'use server';

import { supabase } from '@/lib/supabase';

/**
 * Fetch a specific activity by UUID.
 * Cached to reduce Supabase queries for read-heavy operations!
 */
export async function getActivity(id) {
  const { data, error } = await supabase.from('mg_activities').select('*').eq('id', id).single();
  return { data, error };
}

/**
 * Fetch questions/items for an activity.
 */
export async function getActivityItems(id) {
  const { data, error } = await supabase
    .from('mg_content_items')
    .select('*')
    .eq('activity_id', id)
    .order('position_index', { ascending: true });
  return { data, error };
}
