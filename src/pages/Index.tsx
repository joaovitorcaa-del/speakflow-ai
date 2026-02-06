import { useState } from "react";
import { Onboarding, OnboardingData } from "@/components/Onboarding";
import { HomeScreen } from "@/components/HomeScreen";
import { ChallengeFlow } from "@/components/ChallengeFlow";

type AppView = "onboarding" | "home" | "challenge";

const Index = () => {
  const [view, setView] = useState<AppView>("onboarding");
  const [userData, setUserData] = useState<OnboardingData | null>(null);

  // Mock data
  const userStats = {
    name: "Carlos",
    currentStreak: 8,
    weekProgress: [true, true, true, true, true, false, false],
    weeklyProgress: 71,
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    setUserData(data);
    setView("home");
  };

  const handleStartChallenge = () => {
    setView("challenge");
  };

  const handleChallengeComplete = () => {
    setView("home");
  };

  const handleChallengeBack = () => {
    setView("home");
  };

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

  return (
    <HomeScreen
      userName={userStats.name}
      currentStreak={userStats.currentStreak}
      weekProgress={userStats.weekProgress}
      weeklyProgress={userStats.weeklyProgress}
      onStartChallenge={handleStartChallenge}
    />
  );
};

export default Index;
