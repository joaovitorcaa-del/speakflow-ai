import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MedalType = "gold" | "silver" | "bronze" | "none";

interface WeeklyStatusCardProps {
  weekNumber: number;
  progressPercentage: number;
  currentMedal: MedalType;
  lastWeekMedal: MedalType;
  compensationMinutes?: number;
  minutesSpoken: number;
  weeklyGoalMinutes: number;
  daysActive: number;
}

const medalConfig = {
  gold: {
    icon: Trophy,
    label: "Ouro",
    color: "text-medal-gold",
    bgColor: "bg-medal-gold/10",
    description: "Meta superada!"
  },
  silver: {
    icon: Medal,
    label: "Prata",
    color: "text-medal-silver",
    bgColor: "bg-medal-silver/10",
    description: "Meta atingida"
  },
  bronze: {
    icon: Medal,
    label: "Bronze",
    color: "text-medal-bronze",
    bgColor: "bg-medal-bronze/10",
    description: "Mínimo alcançado"
  },
  none: {
    icon: Medal,
    label: "—",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    description: "Em progresso"
  }
};

export function WeeklyStatusCard({
  weekNumber,
  progressPercentage,
  currentMedal,
  lastWeekMedal,
  compensationMinutes,
  minutesSpoken,
  weeklyGoalMinutes,
  daysActive
}: WeeklyStatusCardProps) {
  const currentConfig = medalConfig[currentMedal];
  const lastConfig = medalConfig[lastWeekMedal];
  const CurrentIcon = currentConfig.icon;
  const LastIcon = lastConfig.icon;

  return (
    <Card variant="elevated" padding="default" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <CardTitle className="text-lg">Semana {weekNumber}</CardTitle>
          <CardDescription>{progressPercentage}% concluída</CardDescription>
        </div>
        
        {/* Medal badges */}
        <div className="flex items-center gap-2">
          {/* Last week medal (smaller) */}
          {lastWeekMedal !== "none" && (
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center opacity-60",
                lastConfig.bgColor
              )}
              title={`Semana anterior: ${lastConfig.label}`}
            >
              <LastIcon className={cn("w-4 h-4", lastConfig.color)} />
            </div>
          )}
          
          {/* Current medal (larger, prominent) */}
          <div 
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
              currentMedal === "none" 
                ? "border-dashed border-muted-foreground/30" 
                : "border-transparent shadow-soft",
              currentConfig.bgColor
            )}
          >
            <CurrentIcon className={cn("w-6 h-6", currentConfig.color)} />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Progress value={progressPercentage} className="h-2.5" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-center mb-3">
        <div>
          <p className="text-lg font-bold">{minutesSpoken}</p>
          <p className="text-xs text-muted-foreground">min falados</p>
        </div>
        <div>
          <p className="text-lg font-bold">{weeklyGoalMinutes}</p>
          <p className="text-xs text-muted-foreground">meta min</p>
        </div>
        <div>
          <p className="text-lg font-bold">{daysActive}/7</p>
          <p className="text-xs text-muted-foreground">dias ativos</p>
        </div>
      </div>

      {/* Compensation message */}
      {compensationMinutes && compensationMinutes > 0 && progressPercentage < 100 && (
        <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Você pode compensar falando <span className="font-semibold text-foreground">+{compensationMinutes} min</span> na próxima semana
          </p>
        </div>
      )}

      {/* Medal status for current week */}
      {currentMedal === "none" && (
        <div className="bg-primary/5 rounded-lg px-3 py-2 mt-2">
          <p className="text-xs text-muted-foreground">
            Faltam <span className="font-semibold text-primary">{Math.max(0, weeklyGoalMinutes - minutesSpoken)} min</span> para medalha de bronze
          </p>
        </div>
      )}
    </Card>
  );
}
