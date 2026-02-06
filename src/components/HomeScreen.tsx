import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ProgressRing } from "@/components/ProgressRing";
import { WeeklyStatusCard } from "@/components/WeeklyStatusCard";
import { FreeTalkCard } from "@/components/FreeTalkCard";
import { MetricCard } from "@/components/MetricCard";
import { useAuth } from "@/hooks/useAuth";
import { useWeeklyStats } from "@/hooks/useWeeklyStats";
import { 
  Play, 
  Clock, 
  Headphones, 
  Mic, 
  Brain,
  ChevronRight,
  Trophy,
  LogOut,
  TrendingUp,
  Target,
  Map
} from "lucide-react";

interface HomeScreenProps {
  userName: string;
  currentStreak: number;
  weekProgress: boolean[];
  weeklyProgress: number;
  onStartChallenge: () => void;
  onStartFreeTalk: () => void;
  onOpenJourney: () => void;
}

export function HomeScreen({ 
  userName, 
  currentStreak, 
  weekProgress,
  weeklyProgress,
  onStartChallenge,
  onStartFreeTalk,
  onOpenJourney
}: HomeScreenProps) {
  const { signOut } = useAuth();
  const { stats } = useWeeklyStats();
  const todayChallenge = {
    title: "Descrevendo seu trabalho",
    duration: "20 min",
    blocks: [
      { icon: Brain, label: "Input", duration: "5 min" },
      { icon: Headphones, label: "Shadowing", duration: "8 min" },
      { icon: Mic, label: "Output", duration: "7 min" },
    ]
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-secondary to-secondary/90 text-secondary-foreground px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-secondary-foreground/70 text-sm">Bom dia,</p>
            <h1 className="text-2xl font-bold">{userName} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            <ProgressRing progress={weeklyProgress} size={56} strokeWidth={5}>
              <span className="text-xs font-bold">{weeklyProgress}%</span>
            </ProgressRing>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={signOut}
              className="text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-secondary-foreground/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <StreakDisplay 
          currentStreak={currentStreak} 
          weekProgress={weekProgress}
          className="justify-center"
        />
      </div>

      <div className="px-6 -mt-4">
        {/* Main Challenge Card */}
        <Card variant="primary" padding="lg" className="mb-6 animate-scale-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium mb-1">
                Desafio do dia
              </p>
              <CardTitle className="text-2xl text-primary-foreground">
                {todayChallenge.title}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{todayChallenge.duration}</span>
            </div>
          </div>

          {/* Challenge blocks preview */}
          <div className="flex gap-2 mb-6">
            {todayChallenge.blocks.map((block, i) => (
              <div 
                key={i}
                className="flex-1 bg-primary-foreground/10 rounded-xl p-3 text-center"
              >
                <block.icon className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <p className="text-xs font-medium opacity-90">{block.label}</p>
                <p className="text-xs opacity-70">{block.duration}</p>
              </div>
            ))}
          </div>

          <Button 
            variant="soft" 
            size="xl" 
            className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            onClick={onStartChallenge}
          >
            <Play className="w-5 h-5" />
            Começar agora
          </Button>
        </Card>

        {/* Weekly Status Card - Main Progress */}
        {stats && (
          <WeeklyStatusCard
            weekNumber={stats.weekNumber}
            progressPercentage={stats.progressPercentage}
            currentMedal={stats.currentMedal}
            lastWeekMedal={stats.lastWeekMedal}
            compensationMinutes={stats.compensationMinutes}
            minutesSpoken={stats.minutesSpoken}
            weeklyGoalMinutes={stats.weeklyGoalMinutes}
            daysActive={stats.daysActive}
          />
        )}

        {/* Free Talk Card */}
        <FreeTalkCard 
          remainingMinutes={10}
          isPremium={false}
          onStart={onStartFreeTalk}
          className="mt-4"
        />

        {/* Quick Stats with Modals */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <MetricCard
            icon={<Mic className="w-6 h-6 text-accent" />}
            value={stats ? `${stats.minutesSpoken}min` : "0min"}
            label="Falando hoje"
            sublabel={stats && stats.minutesSpoken < 20 ? `Faltam ${20 - stats.minutesSpoken} min` : undefined}
            iconBgClass="bg-accent/10"
            modalTitle="Tempo de Fala"
            modalDescription="Baseado nas suas gravações de hoje"
            modalContent={
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Hoje</span>
                  <span className="font-semibold">{stats?.minutesSpoken || 0} min</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Meta diária</span>
                  <span className="font-semibold">20 min</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Esta semana</span>
                  <span className="font-semibold">{stats?.minutesSpoken || 0} min</span>
                </div>
              </div>
            }
            actionLabel="Falar agora"
            onAction={onStartChallenge}
          />
          <MetricCard
            icon={<TrendingUp className="w-6 h-6 text-streak-fire" />}
            value="+32%"
            label="Fluência"
            sublabel="Últimas 3 semanas"
            iconBgClass="bg-streak-fire/10"
            modalTitle="Sua Fluência"
            modalDescription="Evolução baseada nas últimas 3 semanas"
            modalContent={
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Analisamos suas gravações e notamos melhorias em:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-sm">Menos pausas longas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-sm">Frases mais completas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-sm">Pronúncia mais consistente</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Cada resposta é analisada individualmente pela IA
                </p>
              </div>
            }
          />
        </div>

        {/* Journey Button */}
        <button 
          onClick={onOpenJourney}
          className="w-full mt-4 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Map className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">Sua Jornada</p>
              <p className="text-xs text-muted-foreground">Veja seu progresso de fluência</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    </div>
  );
}
