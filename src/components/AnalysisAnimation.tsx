import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisStep {
  label: string;
  icon: string;
}

interface AnalysisAnimationProps {
  onComplete: () => void;
}

const steps: AnalysisStep[] = [
  { label: "Analisando fluência...", icon: "🎯" },
  { label: "Avaliando vocabulário...", icon: "📚" },
  { label: "Verificando pronúncia...", icon: "🗣️" },
  { label: "Gerando feedback...", icon: "✨" },
];

export function AnalysisAnimation({ onComplete }: AnalysisAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCompletedSteps((prev) => [...prev, currentStep]);
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(onComplete, 600);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index && !isCompleted;

          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                isCompleted && "bg-accent/10",
                isCurrent && "bg-muted",
                !isCompleted && !isCurrent && "opacity-40"
              )}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                {isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center animate-analysis-check">
                    <Check className="w-4 h-4 text-accent-foreground" />
                  </div>
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <span className="text-lg">{step.icon}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isCompleted && "text-accent",
                  isCurrent && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
