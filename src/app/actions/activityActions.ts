'use server';

import { getServiceSupabase } from '@/lib/supabase';
import type { ActivityRow, ContentItemRow } from '@/types';

/**
 * Fetch a specific activity by UUID.
 * Cached to reduce Supabase queries for read-heavy operations!
 */
export async function getActivity(id: string): Promise<{ data: ActivityRow | null; error: unknown }> {
  const { data, error } = await getServiceSupabase().from('mg_activities').select('*').eq('id', id).single();
  return { data, error };
}

/**
 * Fetch questions/items for an activity.
 */
export async function getActivityItems(id: string): Promise<{ data: ContentItemRow[] | null; error: unknown }> {
  const { data, error } = await getServiceSupabase()
    .from('mg_content_items')
    .select('*')
    .eq('activity_id', id)
    .order('position_index', { ascending: true });
  return { data, error };
}
