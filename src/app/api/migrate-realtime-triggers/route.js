/**
 * API Route: Generate SQL for Supabase DB Broadcast Triggers
 * 
 * Run: GET /api/migrate-realtime-triggers?secret=init_broadcast_2026
 * Then copy the SQL into Supabase SQL Editor.
 */
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== 'init_broadcast_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl?.replace('https://', '').replace('.supabase.co', '') || 'unknown';

  const migrationSQL = `
-- ==========================================
-- REALTIME BROADCAST FROM DATABASE TRIGGERS
-- ==========================================
-- This migration creates PostgreSQL triggers that automatically
-- broadcast player changes via Supabase Realtime when
-- mg_room_players rows are inserted, updated, or deleted.
--
-- This makes the database the single source of truth for player
-- state, eliminating the need for client-side broadcasts for
-- player join/leave/score events.

-- 1. Enable the realtime extension if not already enabled
-- (This should already be enabled on most Supabase projects)

-- 2. Create the trigger function
CREATE OR REPLACE FUNCTION public.broadcast_player_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use realtime.send() to broadcast to the room channel
  -- This is safe inside triggers (won't roll back the transaction)
  PERFORM realtime.send(
    jsonb_build_object(
      'event', TG_OP,
      'player_id', COALESCE(NEW.id, OLD.id)::text,
      'room_id', COALESCE(NEW.room_id, OLD.room_id),
      'player_name', CASE
        WHEN TG_OP = 'DELETE' THEN OLD.player_name
        ELSE NEW.player_name
      END,
      'is_online', CASE
        WHEN TG_OP = 'DELETE' THEN false
        ELSE NEW.is_online
      END,
      'score', CASE
        WHEN TG_OP = 'DELETE' THEN 0
        ELSE NEW.score
      END,
      'is_host', CASE
        WHEN TG_OP = 'DELETE' THEN false
        ELSE NEW.is_host
      END,
      'avatar_emoji', CASE
        WHEN TG_OP = 'DELETE' THEN OLD.avatar_emoji
        ELSE NEW.avatar_emoji
      END
    ),
    'player_sync',
    'room:' || COALESCE(NEW.room_id, OLD.room_id)
  );

  RETURN NULL; -- AFTER trigger, return value is ignored
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail the transaction
    RAISE WARNING 'broadcast_player_change failed: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- 3. Drop existing trigger if any (idempotent)
DROP TRIGGER IF EXISTS trg_player_change ON public.mg_room_players;

-- 4. Create the trigger
CREATE TRIGGER trg_player_change
  AFTER INSERT OR UPDATE OR DELETE ON public.mg_room_players
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_player_change();

-- 5. Verify the trigger was created
SELECT tgname, tgrelid::regclass, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_player_change';

-- ==========================================
-- DONE! The database will now automatically
-- broadcast player_sync events to all room
-- members whenever players are added, updated,
-- or removed.
-- ==========================================
  `;

  return NextResponse.json({
    message: 'Copy the SQL below and paste it into your Supabase SQL Editor',
    dashboardUrl: 'https://supabase.com/dashboard/project/' + projectRef + '/sql/new',
    sql: migrationSQL.trim(),
    instructions: [
      '1. Go to the Supabase Dashboard → SQL Editor',
      '2. Create a new query',
      '3. Paste the SQL below',
      '4. Click "Run"',
      '5. Verify the trigger appears in the output table',
    ],
  });
}
