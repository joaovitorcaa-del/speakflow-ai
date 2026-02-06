import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VocabularyWord {
  id: string;
  user_id: string;
  word: string;
  pronunciation_url: string | null;
  explanation: string;
  example_phrase: string;
  context_theme: string | null;
  learned_at: string | null;
  is_confident: boolean;
  created_at: string;
}

export interface VocabularyStats {
  totalWords: number;
  thisWeekWords: number;
  pendingWords: VocabularyWord[];
}

export function useVocabulary() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VocabularyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    } else {
      setStats(null);
      setLoading(false);
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get total words learned (marked as confident)
      const { count: totalCount } = await supabase
        .from('vocabulary_words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_confident', true);

      // Get this week's words
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { count: weekCount } = await supabase
        .from('vocabulary_words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_confident', true)
        .gte('learned_at', startOfWeek.toISOString());

      // Get pending words (not yet marked confident)
      const { data: pendingWords } = await supabase
        .from('vocabulary_words')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_confident', false)
        .order('created_at', { ascending: true });

      setStats({
        totalWords: totalCount || 0,
        thisWeekWords: weekCount || 0,
        pendingWords: (pendingWords as VocabularyWord[]) || [],
      });
    } catch (error) {
      console.error('Error fetching vocabulary stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWords = async (theme?: string, count: number = 3) => {
    if (!user) return { error: 'Not authenticated' };

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vocabulary', {
        body: { theme, wordCount: count },
      });

      if (error) throw error;
      
      if (data.error) {
        return { error: data.message || data.error };
      }

      await fetchStats();
      return { success: true, words: data.words, remaining: data.remaining };
    } catch (error: any) {
      console.error('Error generating vocabulary:', error);
      return { error: error.message };
    } finally {
      setGenerating(false);
    }
  };

  const markAsConfident = async (wordId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('vocabulary_words')
        .update({ 
          is_confident: true, 
          learned_at: new Date().toISOString() 
        })
        .eq('id', wordId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchStats();
      return { success: true };
    } catch (error: any) {
      console.error('Error marking word as confident:', error);
      return { error: error.message };
    }
  };

  const getWeeklyHistory = async () => {
    if (!user) return [];

    try {
      // Get words grouped by week
      const { data } = await supabase
        .from('vocabulary_words')
        .select('learned_at')
        .eq('user_id', user.id)
        .eq('is_confident', true)
        .not('learned_at', 'is', null)
        .order('learned_at', { ascending: false });

      if (!data) return [];

      // Group by week
      const weeks: { week: number; count: number }[] = [];
      const weekMap = new Map<number, number>();

      data.forEach(word => {
        if (word.learned_at) {
          const date = new Date(word.learned_at);
          const weekNum = getWeekNumber(date);
          weekMap.set(weekNum, (weekMap.get(weekNum) || 0) + 1);
        }
      });

      weekMap.forEach((count, week) => {
        weeks.push({ week, count });
      });

      return weeks.slice(0, 8); // Last 8 weeks
    } catch (error) {
      console.error('Error fetching weekly history:', error);
      return [];
    }
  };

  return { 
    stats, 
    loading, 
    generating,
    generateWords, 
    markAsConfident,
    getWeeklyHistory,
    refetch: fetchStats 
  };
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil(diff / oneWeek);
}
