import { useState, useEffect } from "react";
import { Onboarding, OnboardingData } from "@/components/Onboarding";
import { HomeScreen } from "@/components/HomeScreen";
import { ChallengeFlow } from "@/components/ChallengeFlow";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AppView = "loading" | "onboarding" | "home" | "challenge";

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

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const { data } = await supabase
      .from('daily_progress')
      .select('date, challenge_completed')
      .eq('user_id', user.id)
      .gte('date', startOfWeek.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (data) {
      const progress = [false, false, false, false, false, false, false];
      data.forEach(day => {
        const dayDate = new Date(day.date);
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

  // Calculate weekly progress percentage
  const completedDays = weekProgress.filter(Boolean).length;
  const weeklyProgress = Math.round((completedDays / 7) * 100);

  return (
    <HomeScreen
      userName={profile?.display_name || "Estudante"}
      currentStreak={profile?.current_streak || 0}
      weekProgress={weekProgress}
      weeklyProgress={weeklyProgress}
      onStartChallenge={handleStartChallenge}
    />
  );
};

export default Index;
