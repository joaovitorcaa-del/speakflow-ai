-- =============================================
-- PROFILES TABLE - User profile data
-- =============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  goal TEXT DEFAULT 'conversation',
  level TEXT DEFAULT 'beginner',
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_speaking_minutes INTEGER NOT NULL DEFAULT 0,
  total_challenges_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- =============================================
-- DAILY_PROGRESS TABLE - Track daily activity
-- =============================================
CREATE TABLE public.daily_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenge_completed BOOLEAN NOT NULL DEFAULT false,
  speaking_minutes INTEGER NOT NULL DEFAULT 0,
  fluency_score INTEGER,
  pronunciation_score INTEGER,
  clarity_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

-- Daily progress policies
CREATE POLICY "Users can view their own progress" 
ON public.daily_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
ON public.daily_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.daily_progress FOR UPDATE 
USING (auth.uid() = user_id);

-- =============================================
-- CHALLENGE_COMPLETIONS TABLE - History of completed challenges
-- =============================================
CREATE TABLE public.challenge_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  challenge_topic TEXT NOT NULL,
  fluency_score INTEGER,
  pronunciation_score INTEGER,
  clarity_score INTEGER,
  feedback_text TEXT,
  speaking_duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

-- Challenge completions policies
CREATE POLICY "Users can view their own completions" 
ON public.challenge_completions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions" 
ON public.challenge_completions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- AUDIO_RECORDINGS TABLE - Metadata for stored audio
-- =============================================
CREATE TABLE public.audio_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_completion_id UUID REFERENCES public.challenge_completions(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  recording_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;

-- Audio recordings policies
CREATE POLICY "Users can view their own recordings" 
ON public.audio_recordings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings" 
ON public.audio_recordings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings" 
ON public.audio_recordings FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKET FOR AUDIO
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-recordings', 
  'audio-recordings', 
  false,
  52428800,
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
);

-- Storage policies for audio bucket
CREATE POLICY "Users can upload their own audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own audio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audio-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_progress_updated_at
BEFORE UPDATE ON public.daily_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_had_yesterday BOOLEAN;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Check if user completed challenge yesterday
  SELECT EXISTS(
    SELECT 1 FROM public.daily_progress 
    WHERE user_id = p_user_id 
    AND date = v_yesterday 
    AND challenge_completed = true
  ) INTO v_had_yesterday;
  
  -- Get current streak
  SELECT current_streak, longest_streak 
  INTO v_current_streak, v_longest_streak
  FROM public.profiles 
  WHERE user_id = p_user_id;
  
  IF v_had_yesterday THEN
    -- Continue streak
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Reset streak
    v_current_streak := 1;
  END IF;
  
  -- Update longest if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Update profile
  UPDATE public.profiles 
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    total_challenges_completed = total_challenges_completed + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;