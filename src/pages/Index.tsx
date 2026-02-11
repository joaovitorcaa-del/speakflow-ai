import { useState, useEffect } from "react";
import { Onboarding } from "@/components/Onboarding";
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
  const { profile, loading: profileLoading, updateProfile, createProfile, refetch: refetchProfile } = useProfile();
  const [view, setView] = useState<AppView>("loading");
  const [weekProgress, setWeekProgress] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [todayChallengeCompleted, setTodayChallengeCompleted] = useState(false);
  const [todayChallengePercentage, setTodayChallengePercentage] = useState(0);
  const [todaySpeakingMinutes, setTodaySpeakingMinutes] = useState(0);
  const [isFixation, setIsFixation] = useState(false);
  const [resumeSession, setResumeSession] = useState<any>(null);

  useEffect(() => {
    if (profileLoading && view === "loading") {
      return;
    }

    if (profile) {
      if (profile.goal && profile.level) {
        setView("home");
        fetchWeekProgress();
        fetchTodayStatus();
      } else {
        setView("onboarding");
      }
    } else if (user && !creatingProfile) {
      setCreatingProfile(true);
      createProfile().finally(() => setCreatingProfile(false));
    }
  }, [profile, profileLoading, user]);

  const fetchTodayStatus = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    // Check daily_progress
    const { data: progress } = await supabase
      .from('daily_progress')
      .select('challenge_completed, speaking_minutes')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (progress) {
      setTodayChallengeCompleted(progress.challenge_completed || false);
      setTodaySpeakingMinutes(progress.speaking_minutes || 0);
    } else {
      setTodayChallengeCompleted(false);
      setTodaySpeakingMinutes(0);
    }

    // Check challenge_sessions for partial progress  
    try {
      const { data: session } = await supabase
        .from('challenge_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (session && !session.completed) {
        const stepsCompleted = session.steps_completed as any;
        if (stepsCompleted) {
          const inputDone = stepsCompleted.inputListened ? 1 : 0;
          const shadowingDone = (stepsCompleted.shadowingRecorded || []).filter(Boolean).length;
          const outputDone = (stepsCompleted.outputRecorded || []).filter(Boolean).length;
          const total = 1 + 5 + 4;
          const pct = Math.round(((inputDone + shadowingDone + outputDone) / total) * 100);
          setTodayChallengePercentage(pct);
        }
        setResumeSession(session);
      } else {
        setTodayChallengePercentage(0);
        setResumeSession(null);
      }
    } catch {
      // Table may not be available yet
      setTodayChallengePercentage(0);
      setResumeSession(null);
    }
  };

  const fetchWeekProgress = async () => {
    if (!user) return;

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

  const handleOnboardingComplete = async () => {
    await updateProfile({
      goal: 'conversation',
      level: 'beginner'
    });
    setView("home");
  };

  const handleStartChallenge = (fixation?: boolean) => {
    setIsFixation(fixation || false);
    setView("challenge");
  };

  const handleStartFreeTalk = () => {
    setView("freetalk");
  };

  const handleFreeTalkComplete = async (minutesSpoken: number) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
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
    await fetchTodayStatus();
    setView("home");
  };

  const handleChallengeComplete = async (speakingMinutes: number, completionPercentage: number) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const challengeCompleted = completionPercentage >= 80;

    if (!isFixation) {
      // Get existing speaking minutes to add to them
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
        challenge_completed: challengeCompleted,
        speaking_minutes: currentMinutes + speakingMinutes
      }, {
        onConflict: 'user_id,date'
      });

      if (challengeCompleted) {
        await supabase.rpc('update_user_streak', { p_user_id: user.id });
      }
    }

    // Refresh data
    await refetchProfile();
    await fetchWeekProgress();
    await fetchTodayStatus();
    setView("home");
  };

  const handleChallengeBack = () => {
    // Save session is handled inside ChallengeFlow
    fetchTodayStatus();
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
        isFixation={isFixation}
        resumeSession={!isFixation && resumeSession && !resumeSession.completed ? {
          current_step: resumeSession.current_step,
          current_index: resumeSession.current_index,
          transcriptions: resumeSession.transcriptions || [],
          speaking_seconds: resumeSession.speaking_seconds || 0,
          steps_completed: resumeSession.steps_completed || {},
        } : null}
      />
    );
  }

  if (view === "freetalk") {
    return (
      <FreeTalkFlow 
        onBack={() => { fetchTodayStatus(); setView("home"); }}
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

  const completedDays = weekProgress.filter(Boolean).length;
  const weeklyProgress = Math.round((completedDays / 7) * 100);

  return (
    <HomeScreen
      userName={profile?.display_name || "Estudante"}
      currentStreak={profile?.current_streak || 0}
      weekProgress={weekProgress}
      weeklyProgress={weeklyProgress}
      userGoal={profile?.goal || 'conversation'}
      todayChallengeCompleted={todayChallengeCompleted}
      todayChallengePercentage={todayChallengePercentage}
      todaySpeakingMinutes={todaySpeakingMinutes}
      onStartChallenge={handleStartChallenge}
      onStartFreeTalk={handleStartFreeTalk}
      onOpenJourney={() => setView("journey")}
    />
  );
};

function mapLevelToCategory(level: string | null | undefined): string {
  switch (level) {
    case 'beginner': return 'starter';
    case 'intermediate': return 'confident';
    case 'advanced': return 'clear';
    default: return 'starter';
  }
}

export default Index;
