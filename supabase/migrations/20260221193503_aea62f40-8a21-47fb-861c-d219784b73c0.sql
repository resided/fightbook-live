
-- Fighters table with point budget system (250 total, 30-99 per stat)
CREATE TABLE public.fighters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  style TEXT NOT NULL,
  power INTEGER NOT NULL CHECK (power >= 30 AND power <= 99),
  speed INTEGER NOT NULL CHECK (speed >= 30 AND speed <= 99),
  defense INTEGER NOT NULL CHECK (defense >= 30 AND defense <= 99),
  stamina INTEGER NOT NULL CHECK (stamina >= 30 AND stamina <= 99),
  technique INTEGER NOT NULL CHECK (technique >= 30 AND technique <= 99),
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ko_wins INTEGER NOT NULL DEFAULT 0,
  ko_losses INTEGER NOT NULL DEFAULT 0,
  sub_wins INTEGER NOT NULL DEFAULT 0,
  total_fights INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Constraint: total stats must equal 250
ALTER TABLE public.fighters ADD CONSTRAINT stat_budget CHECK (power + speed + defense + stamina + technique = 250);

-- Fights table with full fight record
CREATE TABLE public.fights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fighter_a_id UUID NOT NULL REFERENCES public.fighters(id),
  fighter_b_id UUID NOT NULL REFERENCES public.fighters(id),
  winner_id UUID REFERENCES public.fighters(id),
  method TEXT NOT NULL, -- KO, TKO, Submission, Decision, Split Decision, Draw
  finish_round INTEGER NOT NULL,
  total_rounds INTEGER NOT NULL DEFAULT 5,
  narration TEXT, -- AI-generated fight narration
  round_data JSONB, -- detailed round-by-round data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fighters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fights ENABLE ROW LEVEL SECURITY;

-- Public read/write for fighters (no auth, it's a public arcade game)
CREATE POLICY "Anyone can view fighters" ON public.fighters FOR SELECT USING (true);
CREATE POLICY "Anyone can create fighters" ON public.fighters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fighters" ON public.fighters FOR UPDATE USING (true);

-- Public read for fights, insert via backend
CREATE POLICY "Anyone can view fights" ON public.fights FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fights" ON public.fights FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fights" ON public.fights FOR UPDATE USING (true);

-- Indexes for leaderboard queries
CREATE INDEX idx_fighters_elo ON public.fighters(elo_rating DESC);
CREATE INDEX idx_fighters_wins ON public.fighters(wins DESC);
CREATE INDEX idx_fights_created ON public.fights(created_at DESC);
CREATE INDEX idx_fights_fighter_a ON public.fights(fighter_a_id);
CREATE INDEX idx_fights_fighter_b ON public.fights(fighter_b_id);
