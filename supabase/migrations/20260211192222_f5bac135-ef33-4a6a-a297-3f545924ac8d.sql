
-- Create challenge_sessions table to save/resume daily challenge progress
CREATE TABLE public.challenge_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_step TEXT NOT NULL DEFAULT 'input',
  current_index INTEGER NOT NULL DEFAULT 0,
  transcriptions JSONB DEFAULT '[]'::jsonb,
  speaking_seconds INTEGER DEFAULT 0,
  steps_completed JSONB DEFAULT '{}'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.challenge_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sessions"
ON public.challenge_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.challenge_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.challenge_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON public.challenge_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_challenge_sessions_updated_at
BEFORE UPDATE ON public.challenge_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
