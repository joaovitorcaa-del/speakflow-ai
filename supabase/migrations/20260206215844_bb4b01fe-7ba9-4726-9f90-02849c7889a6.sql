-- Table to store vocabulary words generated for users
CREATE TABLE public.vocabulary_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  pronunciation_url TEXT,
  explanation TEXT NOT NULL,
  example_phrase TEXT NOT NULL,
  context_theme TEXT,
  learned_at TIMESTAMP WITH TIME ZONE,
  is_confident BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own vocabulary"
ON public.vocabulary_words
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary"
ON public.vocabulary_words
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary"
ON public.vocabulary_words
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_vocabulary_words_updated_at
BEFORE UPDATE ON public.vocabulary_words
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_vocabulary_words_user_id ON public.vocabulary_words(user_id);
CREATE INDEX idx_vocabulary_words_created_at ON public.vocabulary_words(created_at DESC);