import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const CACHE_KEYS = {
  PROGRESS: 'speakdaily_progress_cache',
  VOCABULARY: 'speakdaily_vocabulary_cache',
  PROFILE: 'speakdaily_profile_cache',
  LAST_SYNC: 'speakdaily_last_sync',
};

interface CachedProgress {
  weekProgress: boolean[];
  weeklyStats: {
    minutesSpoken: number;
    daysActive: number;
    progressPercentage: number;
  };
  lastUpdated: string;
}

interface CachedVocabulary {
  words: Array<{
    id: string;
    word: string;
    explanation: string;
    example_phrase: string;
    is_confident: boolean;
  }>;
  totalWords: number;
  lastUpdated: string;
}

interface CachedProfile {
  display_name: string | null;
  current_streak: number;
  level: string | null;
  goal: string | null;
  lastUpdated: string;
}

export function useOfflineCache() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache progress data
  const cacheProgress = useCallback((data: CachedProgress) => {
    try {
      localStorage.setItem(CACHE_KEYS.PROGRESS, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache progress:', error);
    }
  }, []);

  // Cache vocabulary data
  const cacheVocabulary = useCallback((data: CachedVocabulary) => {
    try {
      localStorage.setItem(CACHE_KEYS.VOCABULARY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache vocabulary:', error);
    }
  }, []);

  // Cache profile data
  const cacheProfile = useCallback((data: CachedProfile) => {
    try {
      localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache profile:', error);
    }
  }, []);

  // Get cached progress
  const getCachedProgress = useCallback((): CachedProgress | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.PROGRESS);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  // Get cached vocabulary
  const getCachedVocabulary = useCallback((): CachedVocabulary | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.VOCABULARY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  // Get cached profile
  const getCachedProfile = useCallback((): CachedProfile | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.PROFILE);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  // Sync all data from server and cache it
  const syncAndCache = useCallback(async () => {
    if (!user || !isOnline) return;

    setIsSyncing(true);

    try {
      // Sync profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, current_streak, level, goal')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        cacheProfile({
          ...profile,
          lastUpdated: new Date().toISOString(),
        });
      }

      // Sync vocabulary
      const { data: words, count } = await supabase
        .from('vocabulary_words')
        .select('id, word, explanation, example_phrase, is_confident', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (words) {
        cacheVocabulary({
          words,
          totalWords: count || 0,
          lastUpdated: new Date().toISOString(),
        });
      }

      // Sync weekly progress
      const today = new Date();
      const currentDayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - currentDayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatLocalDate(startOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      const endDateStr = formatLocalDate(endOfWeek);

      const { data: progressData } = await supabase
        .from('daily_progress')
        .select('date, challenge_completed, speaking_minutes')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lt('date', endDateStr);

      if (progressData) {
        const weekProgress = [false, false, false, false, false, false, false];
        let totalMinutes = 0;
        let daysActive = 0;

        progressData.forEach(day => {
          const [year, month, dayNum] = day.date.split('-').map(Number);
          const dayDate = new Date(year, month - 1, dayNum);
          const dayIndex = dayDate.getDay();
          if (day.challenge_completed) {
            weekProgress[dayIndex] = true;
            daysActive++;
          }
          totalMinutes += day.speaking_minutes || 0;
        });

        const weeklyGoal = 150;
        const minutesProgress = (totalMinutes / weeklyGoal) * 60;
        const daysProgress = (daysActive / 7) * 40;
        const progressPercentage = Math.min(150, Math.round(minutesProgress + daysProgress));

        cacheProgress({
          weekProgress,
          weeklyStats: {
            minutesSpoken: totalMinutes,
            daysActive,
            progressPercentage,
          },
          lastUpdated: new Date().toISOString(),
        });
      }

      localStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, cacheProfile, cacheVocabulary, cacheProgress]);

  // Get last sync time
  const getLastSyncTime = useCallback((): Date | null => {
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    return lastSync ? new Date(lastSync) : null;
  }, []);

  // Clear all cache
  const clearCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);

  return {
    isOnline,
    isSyncing,
    syncAndCache,
    cacheProgress,
    cacheVocabulary,
    cacheProfile,
    getCachedProgress,
    getCachedVocabulary,
    getCachedProfile,
    getLastSyncTime,
    clearCache,
  };
}
