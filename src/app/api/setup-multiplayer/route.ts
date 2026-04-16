// src/app/api/setup-multiplayer/route.js
// Uses Supabase Management API to run SQL migration for multiplayer tables
import { NextResponse } from 'next/server';

export async function GET(request: any) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== 'init_multiplayer_2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  // The full migration SQL
  const migrationSQL = `
-- ==========================================
-- MULTIPLAYER TABLES MIGRATION
-- ==========================================

-- 1. Create mg_rooms table
CREATE TABLE IF NOT EXISTS public.mg_rooms (
  id TEXT PRIMARY KEY,
  activity_id UUID REFERENCES public.mg_activities(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',
  current_question INT DEFAULT -1,
  max_players INT DEFAULT 40,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '3 hours')
);

-- 2. Create mg_room_players table
CREATE TABLE IF NOT EXISTS public.mg_room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES public.mg_rooms(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '😀',
  score INT DEFAULT 0,
  streak INT DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  is_host BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add multiplayer columns to mg_play_sessions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mg_play_sessions' AND column_name='room_id') THEN
    ALTER TABLE public.mg_play_sessions ADD COLUMN room_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mg_play_sessions' AND column_name='mode') THEN
    ALTER TABLE public.mg_play_sessions ADD COLUMN mode TEXT DEFAULT 'solo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mg_play_sessions' AND column_name='answers_detail') THEN
    ALTER TABLE public.mg_play_sessions ADD COLUMN answers_detail JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.mg_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mg_room_players ENABLE ROW LEVEL SECURITY;

-- 5. Policies for mg_rooms
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mg_rooms' AND policyname='rooms_select') THEN
    CREATE POLICY "rooms_select" ON public.mg_rooms FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mg_rooms' AND policyname='rooms_insert') THEN
    CREATE POLICY "rooms_insert" ON public.mg_rooms FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mg_rooms' AND policyname='rooms_update') THEN
    CREATE POLICY "rooms_update" ON public.mg_rooms FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mg_rooms' AND policyname='rooms_delete') THEN
    CREATE POLICY "rooms_delete" ON public.mg_rooms FOR DELETE USING (true);
  END IF;
END $$;

-- 6. Policies for mg_room_players
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mg_room_players' AND policyname='room_players_select') THEN
    CREATE POLICY "room_players_select" ON public.mg_room_players FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mg_room_players' AND policyname='room_players_insert') THEN
    CREATE POLICY "room_players_insert" ON public.mg_room_players FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mg_room_players' AND policyname='room_players_update') THEN
    CREATE POLICY "room_players_update" ON public.mg_room_players FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mg_room_players' AND policyname='room_players_delete') THEN
    CREATE POLICY "room_players_delete" ON public.mg_room_players FOR DELETE USING (true);
  END IF;
END $$;

-- 7. Indexes (query-composite-indexes & advanced-jsonb-indexing)
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON public.mg_room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_activity_id ON public.mg_rooms(activity_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.mg_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_players_leaderboard ON public.mg_room_players(room_id, score DESC, joined_at);
CREATE INDEX IF NOT EXISTS idx_rooms_settings_gin ON public.mg_rooms USING GIN (settings);
CREATE INDEX IF NOT EXISTS idx_room_players_answers_gin ON public.mg_room_players USING GIN (answers);

-- 8. RPC Functions for Short Transactions (lock-short-transactions)
CREATE OR REPLACE FUNCTION public.submit_minigame_answer(
  p_id UUID,
  new_score INT,
  new_streak INT,
  answer_record JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fast, localized lock for high-concurrency updates
  UPDATE public.mg_room_players
  SET 
    score = new_score,
    streak = new_streak,
    answers = answers || jsonb_build_array(answer_record)
  WHERE id = p_id;
END;
$$;

-- 9. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mg_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mg_room_players;
  `;

  try {
    // Use the Supabase PostgREST raw SQL endpoint
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    // PostgREST doesn't support raw SQL, so let's use pg-meta or return SQL for manual execution
    // Return the SQL and instructions
    return NextResponse.json({
      message: 'Please copy the SQL below and paste it into your Supabase SQL Editor at: https://supabase.com/dashboard/project/' + projectRef + '/sql/new',
      projectRef,
      dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
      sql: migrationSQL,
    });

  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      sql: migrationSQL,
      message: 'Error occurred. Please run the SQL manually in Supabase SQL Editor.',
    });
  }
}
