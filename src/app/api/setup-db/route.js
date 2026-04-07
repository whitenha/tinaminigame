// src/app/api/setup-db/route.js
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// WARNING: This is a setup utility route. In production, protect this or remove it.
export async function GET(request) {
  // Simple protection: require a secret query parameter
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== 'init_minigame_2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  // Create tables using raw RPC if available, or direct REST query
  // Supabase JS doesn't easily run raw DDL, but we can do it with RPC if we set one up.
  // Since we can't easily run multi-statement SQL from the JS client without an RPC, 
  // we will return the exact SQL script here for the user to paste into the Supabase SQL Editor.
  
  const setupSQL = `
-- ==========================================
-- TINA MINIGAME: SUPABASE INITIALIZATION DB
-- ==========================================

-- 1. Create mg_activities table
CREATE TABLE IF NOT EXISTS public.mg_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    template_slug TEXT NOT NULL,
    content_format TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT true,
    share_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create mg_content_items table
CREATE TABLE IF NOT EXISTS public.mg_content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.mg_activities(id) ON DELETE CASCADE,
    position_index INTEGER DEFAULT 0,
    term TEXT,
    definition TEXT,
    image_url TEXT,
    audio_url TEXT,
    group_name TEXT,
    options JSONB,
    is_correct BOOLEAN DEFAULT false,
    extra_data JSONB DEFAULT '{}'::jsonb
);

-- 3. Create mg_play_sessions table
CREATE TABLE IF NOT EXISTS public.mg_play_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.mg_activities(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    player_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    time_seconds INTEGER DEFAULT 0,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create mg_play_answers table
CREATE TABLE IF NOT EXISTS public.mg_play_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.mg_play_sessions(id) ON DELETE CASCADE,
    content_item_id UUID REFERENCES public.mg_content_items(id) ON DELETE SET NULL,
    answer TEXT,
    is_correct BOOLEAN,
    time_ms INTEGER
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.mg_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mg_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mg_play_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mg_play_answers ENABLE ROW LEVEL SECURITY;

-- Create basic policies (Allow public read, allow authenticated create)
-- For Activities
CREATE POLICY "Activities are viewable by everyone" 
ON public.mg_activities FOR SELECT USING (true);

CREATE POLICY "Users can create activities" 
ON public.mg_activities FOR INSERT WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);

CREATE POLICY "Users can update their own activities" 
ON public.mg_activities FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own activities" 
ON public.mg_activities FOR DELETE USING (auth.uid() = creator_id);

-- For Content Items
CREATE POLICY "Items are viewable by everyone" 
ON public.mg_content_items FOR SELECT USING (true);

CREATE POLICY "Users can insert items for their activities" 
ON public.mg_content_items FOR INSERT WITH CHECK (true); -- Ideally join with activities to check ownership

CREATE POLICY "Users can update items for their activities" 
ON public.mg_content_items FOR UPDATE USING (true);

CREATE POLICY "Users can delete items for their activities" 
ON public.mg_content_items FOR DELETE USING (true);

-- For Sessions & Answers
CREATE POLICY "Anyone can create play sessions"
ON public.mg_play_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view sessions for public activities"
ON public.mg_play_sessions FOR SELECT USING (true);

CREATE POLICY "Anyone can submit answers"
ON public.mg_play_answers FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view answers"
ON public.mg_play_answers FOR SELECT USING (true);
  `;

  return new NextResponse(setupSQL, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
