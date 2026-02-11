import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, eachWeekOfInterval, isWithinInterval, parseISO } from "date-fns";

export interface DayData {
  date: string;
  challenge_completed: boolean;
  speaking_minutes: number;
  fluency_score: number | null;
  pronunciation_score: number | null;
  clarity_score: number | null;
}

export interface WeekMedal {
  weekStart: Date;
  medal: "gold" | "silver" | "bronze" | null;
}

export interface JourneyTotals {
  totalMinutes: number;
  totalWords: number;
}

export function useCalendarHistory(visibleMonth: Date) {
  const { user } = useAuth();
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [totals, setTotals] = useState<JourneyTotals>({ totalMinutes: 0, totalWords: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const rangeStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const fetchData = async () => {
      setLoading(true);

      const [progressRes, profileRes, vocabRes] = await Promise.all([
        supabase
          .from("daily_progress")
          .select("date, challenge_completed, speaking_minutes, fluency_score, pronunciation_score, clarity_score")
          .eq("user_id", user.id)
          .gte("date", format(rangeStart, "yyyy-MM-dd"))
          .lte("date", format(rangeEnd, "yyyy-MM-dd")),
        supabase
          .from("profiles")
          .select("total_speaking_minutes")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("vocabulary_words")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_confident", true),
      ]);

      setDayData((progressRes.data as DayData[]) || []);
      setTotals({
        totalMinutes: profileRes.data?.total_speaking_minutes || 0,
        totalWords: vocabRes.count || 0,
      });
      setLoading(false);
    };

    fetchData();
  }, [user, visibleMonth]);

  const weekMedals = useMemo<WeekMedal[]>(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const weekDays = dayData.filter((d) => {
        const date = parseISO(d.date);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      });

      const totalMinutes = weekDays.reduce((sum, d) => sum + d.speaking_minutes, 0);
      const daysActive = weekDays.filter((d) => d.speaking_minutes > 0).length;

      const minutesProgress = (totalMinutes / 150) * 60;
      const daysProgress = (daysActive / 7) * 40;
      const total = minutesProgress + daysProgress;

      let medal: "gold" | "silver" | "bronze" | null = null;
      if (total >= 120) medal = "gold";
      else if (total >= 100) medal = "silver";
      else if (total >= 60) medal = "bronze";

      return { weekStart, medal };
    });
  }, [dayData, visibleMonth]);

  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>();
    dayData.forEach((d) => map.set(d.date, d));
    return map;
  }, [dayData]);

  return { dayDataMap, weekMedals, totals, loading };
}
