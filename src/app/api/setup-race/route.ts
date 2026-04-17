/**
 * One-time setup for Gameshow Race tables.
 * GET /api/setup-race → Creates mg_race_state table
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const sb = createClient(supabaseUrl, serviceKey);

  const sql = `
    CREATE TABLE IF NOT EXISTS mg_race_state (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      room_id text NOT NULL,
      player_id uuid NOT NULL,
      
      current_question int DEFAULT 0,
      score int DEFAULT 0,
      correct_count int DEFAULT 0,
      total_attempted int DEFAULT 0,
      streak int DEFAULT 0,
      
      inventory text[] DEFAULT '{}',
      active_effects jsonb DEFAULT '[]',
      is_finished boolean DEFAULT false,
      lock_until timestamptz,
      
      race_started_at timestamptz NOT NULL DEFAULT now(),
      race_duration_sec int NOT NULL DEFAULT 300,
      
      updated_at timestamptz DEFAULT now(),
      
      UNIQUE(room_id, player_id)
    );

    ALTER TABLE mg_race_state ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mg_race_state' AND policyname = 'race_state_select') THEN
        CREATE POLICY "race_state_select" ON mg_race_state FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mg_race_state' AND policyname = 'race_state_insert') THEN
        CREATE POLICY "race_state_insert" ON mg_race_state FOR INSERT WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mg_race_state' AND policyname = 'race_state_update') THEN
        CREATE POLICY "race_state_update" ON mg_race_state FOR UPDATE USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mg_race_state' AND policyname = 'race_state_delete') THEN
        CREATE POLICY "race_state_delete" ON mg_race_state FOR DELETE USING (true);
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_race_state_room ON mg_race_state(room_id);
    CREATE INDEX IF NOT EXISTS idx_race_state_player ON mg_race_state(room_id, player_id);
  `;

  const { error } = await sb.rpc('exec_sql', { sql_text: sql }).single();
  
  // Fallback: try raw SQL if rpc doesn't exist
  if (error) {
    // Use the REST API to execute SQL
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql_text: sql }),
    });

    if (!res.ok) {
      // Direct SQL execution via pg endpoint
      const pgRes = await fetch(`${supabaseUrl}/pg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!pgRes.ok) {
        return NextResponse.json({ 
          error: 'Could not auto-create table. Please run the SQL manually.',
          sql_to_run: sql,
          original_error: error?.message 
        }, { status: 500 });
      }
    }
  }

  // Enable Realtime
  try {
    await sb.rpc('exec_sql', { 
      sql_text: "ALTER PUBLICATION supabase_realtime ADD TABLE mg_race_state;" 
    });
  } catch (e) {
    // May already be added
  }

  return NextResponse.json({ success: true, message: 'mg_race_state table created!' });
}
