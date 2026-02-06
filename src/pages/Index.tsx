import { useState, useEffect } from "react";
import { Onboarding, OnboardingData } from "@/components/Onboarding";
import { HomeScreen } from "@/components/HomeScreen";
import { ChallengeFlow } from "@/components/ChallengeFlow";
import { FreeTalkFlow } from "@/components/FreeTalkFlow";
import { JourneyScreen } from "@/components/JourneyScreen";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AppView = "loading" | "onboarding" | "home" | "challenge" | "freetalk" | "journey";

const Index = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [view, setView] = useState<AppView>("loading");
  const [weekProgress, setWeekProgress] = useState<boolean[]>([false, false, false, false, false, false, false]);

  useEffect(() => {
    if (profileLoading) {
      setView("loading");
      return;
    }

    if (profile) {
      // Check if user has completed onboarding (has goal set)
      if (profile.goal && profile.level !== 'beginner') {
        setView("home");
        fetchWeekProgress();
      } else {
        setView("onboarding");
      }
    }
  }, [profile, profileLoading]);

  const fetchWeekProgress = async () => {
    if (!user) return;

    // Use local timezone for accurate day calculation
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate start of week (Sunday) in local time
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Format dates as YYYY-MM-DD in local timezone
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
    
    const { data } = await supabase
      .from('daily_progress')
      .select('date, challenge_completed')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .lt('date', endDateStr)
      .order('date', { ascending: true });

    if (data) {
      const progress = [false, false, false, false, false, false, false];
      data.forEach(day => {
        // Parse date string directly without timezone conversion
        const [year, month, dayNum] = day.date.split('-').map(Number);
        const dayDate = new Date(year, month - 1, dayNum);
        const dayIndex = dayDate.getDay();
        if (day.challenge_completed) {
          progress[dayIndex] = true;
        }
      });
      setWeekProgress(progress);
    }
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    await updateProfile({
      goal: data.goal,
      level: data.level
    });
    setView("home");
  };

  const handleStartChallenge = () => {
    setView("challenge");
  };

  const handleStartFreeTalk = () => {
    setView("freetalk");
  };

  const handleFreeTalkComplete = async (minutesSpoken: number) => {
    if (!user) return;

    // Record speaking minutes from free talk
    const today = new Date().toISOString().split('T')[0];
    
    // Get existing progress for today
    const { data: existing } = await supabase
      .from('daily_progress')
      .select('speaking_minutes')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const currentMinutes = existing?.speaking_minutes || 0;

    await supabase.from('daily_progress').upsert({
      user_id: user.id,
      date: today,
      speaking_minutes: currentMinutes + minutesSpoken
    }, {
      onConflict: 'user_id,date'
    });

    await fetchWeekProgress();
    setView("home");
  };

  const handleChallengeComplete = async () => {
    if (!user) return;

    // Record daily progress
    const today = new Date().toISOString().split('T')[0];
    
    await supabase.from('daily_progress').upsert({
      user_id: user.id,
      date: today,
      challenge_completed: true,
      speaking_minutes: 20
    }, {
      onConflict: 'user_id,date'
    });

    // Update streak
    await supabase.rpc('update_user_streak', { p_user_id: user.id });

    // Refresh data
    await fetchWeekProgress();
    setView("home");
  };

  const handleChallengeBack = () => {
    setView("home");
  };

  if (view === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (view === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (view === "challenge") {
    return (
      <ChallengeFlow 
        onBack={handleChallengeBack}
        onComplete={handleChallengeComplete}
      />
    );
  }

  if (view === "freetalk") {
    return (
      <FreeTalkFlow 
        onBack={() => setView("home")}
        onComplete={handleFreeTalkComplete}
      />
    );
  }

  if (view === "journey") {
    return (
      <JourneyScreen 
        currentLevel={mapLevelToCategory(profile?.level)}
        onBack={() => setView("home")}
      />
    );
  }

  // Calculate weekly progress percentage
  const completedDays = weekProgress.filter(Boolean).length;
  const weeklyProgress = Math.round((completedDays / 7) * 100);

  const handleOpenJourney = () => {
    setView("journey");
  };

  return (
    <HomeScreen
      userName={profile?.display_name || "Estudante"}
      currentStreak={profile?.current_streak || 0}
      weekProgress={weekProgress}
      weeklyProgress={weeklyProgress}
      onStartChallenge={handleStartChallenge}
      onStartFreeTalk={handleStartFreeTalk}
      onOpenJourney={handleOpenJourney}
    />
  );
};

// Map database level to fluency category
function mapLevelToCategory(level: string | null | undefined): string {
  switch (level) {
    case 'beginner':
      return 'starter';
    case 'intermediate':
      return 'confident';
    case 'advanced':
      return 'clear';
    default:
      return 'starter';
  }
}

export default Index;
