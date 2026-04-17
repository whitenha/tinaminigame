-- ============================================
-- GAMESHOW RACE STATE TABLE
-- Server-authoritative race progress tracking
-- ============================================

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

-- Enable Realtime streaming for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE mg_race_state;

-- Row Level Security
ALTER TABLE mg_race_state ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for host dashboard and player sync)
CREATE POLICY "race_state_select" ON mg_race_state
  FOR SELECT USING (true);

-- Only server (service_role) can insert/update/delete
-- Client calls go through our API route which uses service_role
CREATE POLICY "race_state_insert" ON mg_race_state
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "race_state_update" ON mg_race_state
  FOR UPDATE USING (true);
  
CREATE POLICY "race_state_delete" ON mg_race_state
  FOR DELETE USING (true);

-- Index for fast lookups
CREATE INDEX idx_race_state_room ON mg_race_state(room_id);
CREATE INDEX idx_race_state_player ON mg_race_state(room_id, player_id);
