import { AppPreviewCarousel } from "./AppPreviewCarousel";

interface OnboardingProps {
  onComplete: (selectedGoal: string) => void;
}

export interface OnboardingData {
  goal: string;
  level: string;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  return <AppPreviewCarousel onComplete={onComplete} />;
}
