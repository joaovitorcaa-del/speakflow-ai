import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, Mic, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssessmentFlow } from "./AssessmentFlow";

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

export interface OnboardingData {
  goal: string;
  level: string;
}

const goals = [
  { id: "work", label: "Trabalho", icon: "💼", description: "Reuniões, emails e apresentações" },
  { id: "travel", label: "Viagem", icon: "✈️", description: "Turismo e situações do dia a dia" },
  { id: "conversation", label: "Conversação", icon: "💬", description: "Falar com nativos naturalmente" },
  { id: "study", label: "Estudo", icon: "📚", description: "Intercâmbio ou certificação" },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1 && selectedGoal) {
      setStep(2);
    }
  };

  const handleStartAssessment = () => {
    setShowAssessment(true);
  };

  const handleAssessmentComplete = (level: string) => {
    onComplete({
      goal: selectedGoal || "conversation",
      level,
    });
  };

  const handleAssessmentBack = () => {
    setShowAssessment(false);
  };

  // Show interactive assessment
  if (showAssessment && selectedGoal) {
    return (
      <AssessmentFlow
        goal={selectedGoal}
        onComplete={handleAssessmentComplete}
        onBack={handleAssessmentBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-8 pb-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i === step ? "w-8 bg-primary" : i < step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col px-6 pb-8">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-8 shadow-glow">
              <MessageCircle className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-4">
              Destrave sua fala<br />em inglês
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-sm">
              Desafios diários guiados por IA para você falar inglês com confiança em 6 meses.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <div className="flex items-center gap-3 text-left p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Feedback instantâneo com IA</p>
                  <p className="text-sm text-muted-foreground">Como ter um tutor 24h</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Foco 100% em fala</p>
                  <p className="text-sm text-muted-foreground">Nada de gramática chata</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Goal Selection */}
        {step === 1 && (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-2">Qual seu objetivo?</h2>
            <p className="text-muted-foreground mb-6">
              Vamos personalizar sua jornada
            </p>
            <div className="flex flex-col gap-3">
              {goals.map((goal) => (
                <Card
                  key={goal.id}
                  variant={selectedGoal === goal.id ? "primary" : "interactive"}
                  padding="default"
                  onClick={() => setSelectedGoal(goal.id)}
                  className={cn(
                    "cursor-pointer",
                    selectedGoal === goal.id && "scale-[1.02]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{goal.icon}</span>
                    <div>
                      <p className="font-semibold">{goal.label}</p>
                      <p className={cn(
                        "text-sm",
                        selectedGoal === goal.id ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {goal.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Assessment Intro */}
        {step === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-8 relative">
              <Mic className="w-16 h-16 text-primary" />
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-4">
              Vamos conhecer seu nível
            </h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Fale por 60 segundos sobre qualquer tema. Nossa IA vai analisar sua fluência, pronúncia e vocabulário.
            </p>
            <div className="bg-muted/50 p-4 rounded-xl mb-8 max-w-sm">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Dica:</strong> Fale sobre seu dia, seu trabalho, ou conte uma história. Não existe resposta certa!
              </p>
            </div>
          </div>
        )}

        {/* Bottom button */}
        <div className="mt-auto pt-4">
          {step < 2 ? (
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={handleNext}
              disabled={step === 1 && !selectedGoal}
            >
              Continuar
              <ArrowRight className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={handleStartAssessment}
            >
              <Mic className="w-5 h-5" />
              Começar jornada
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
