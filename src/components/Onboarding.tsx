import { AppPreviewCarousel } from "./AppPreviewCarousel";

interface OnboardingProps {
  onComplete: () => void;
}

export interface OnboardingData {
  goal: string;
  level: string;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  return <AppPreviewCarousel onComplete={onComplete} />;
}
