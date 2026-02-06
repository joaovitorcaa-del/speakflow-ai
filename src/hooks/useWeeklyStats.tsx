import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type MedalType = "gold" | "silver" | "bronze" | "none";

interface WeeklyStats {
  weekNumber: number;
  minutesSpoken: number;
  weeklyGoalMinutes: number;
  daysActive: number;
  challengesCompleted: number;
  progressPercentage: number;
  currentMedal: MedalType;
  lastWeekMedal: MedalType;
  compensationMinutes: number;
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function calculateMedal(progressPercentage: number): MedalType {
  if (progressPercentage >= 120) return "gold";
  if (progressPercentage >= 100) return "silver";
  if (progressPercentage >= 60) return "bronze";
  return "none";
}

export function useWeeklyStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    fetchWeeklyStats();
  }, [user]);

  const fetchWeeklyStats = async () => {
    if (!user) return;

    setLoading(true);
    const today = new Date();
    const currentWeekStart = getStartOfWeek(today);
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    try {
      // Fetch current week's progress
      const { data: currentWeekData } = await supabase
        .from('daily_progress')
        .select('speaking_minutes, challenge_completed, date')
        .eq('user_id', user.id)
        .gte('date', currentWeekStart.toISOString().split('T')[0])
        .lt('date', new Date(currentWeekStart.getTime() + 7 * 86400000).toISOString().split('T')[0]);

      // Fetch last week's progress
      const { data: lastWeekData } = await supabase
        .from('daily_progress')
        .select('speaking_minutes, challenge_completed')
        .eq('user_id', user.id)
        .gte('date', lastWeekStart.toISOString().split('T')[0])
        .lt('date', currentWeekStart.toISOString().split('T')[0]);

      // Calculate current week stats
      const currentMinutes = currentWeekData?.reduce((sum, d) => sum + (d.speaking_minutes || 0), 0) || 0;
      const currentDaysActive = currentWeekData?.filter(d => d.challenge_completed)?.length || 0;
      const currentChallenges = currentWeekData?.filter(d => d.challenge_completed)?.length || 0;

      // Calculate last week stats for medal
      const lastWeekMinutes = lastWeekData?.reduce((sum, d) => sum + (d.speaking_minutes || 0), 0) || 0;
      
      // Weekly goal: 150 minutes (average 20 min/day, 7 days, with some flexibility)
      const weeklyGoalMinutes = 150;
      
      // Progress based on combined metrics
      const minutesProgress = (currentMinutes / weeklyGoalMinutes) * 60; // 60% weight
      const daysProgress = (currentDaysActive / 7) * 40; // 40% weight
      const progressPercentage = Math.min(150, Math.round(minutesProgress + daysProgress));

      // Last week progress for medal
      const lastWeekProgress = (lastWeekMinutes / weeklyGoalMinutes) * 100;
      
      // Calculate compensation (if last week was below 80%, allow making up)
      const lastWeekDeficit = lastWeekProgress < 80 ? weeklyGoalMinutes - lastWeekMinutes : 0;
      const compensationMinutes = Math.round(lastWeekDeficit * 0.5); // Can compensate 50% of deficit

      setStats({
        weekNumber: getWeekNumber(today),
        minutesSpoken: currentMinutes,
        weeklyGoalMinutes,
        daysActive: currentDaysActive,
        challengesCompleted: currentChallenges,
        progressPercentage,
        currentMedal: calculateMedal(progressPercentage),
        lastWeekMedal: calculateMedal(lastWeekProgress),
        compensationMinutes
      });
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchWeeklyStats };
}
