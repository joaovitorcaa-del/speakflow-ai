import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ProgressRing } from "@/components/ProgressRing";
import { useAuth } from "@/hooks/useAuth";
import { 
  Play, 
  Clock, 
  Headphones, 
  Mic, 
  Brain,
  ChevronRight,
  Trophy,
  LogOut
} from "lucide-react";
interface HomeScreenProps {
  userName: string;
  currentStreak: number;
  weekProgress: boolean[];
  weeklyProgress: number;
  onStartChallenge: () => void;
}

export function HomeScreen({ 
  userName, 
  currentStreak, 
  weekProgress,
  weeklyProgress,
  onStartChallenge 
}: HomeScreenProps) {
  const { signOut } = useAuth();
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

        {/* Week Overview */}
        <Card variant="elevated" padding="default" className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Semana 3</CardTitle>
              <CardDescription>Unlock Your Voice</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">5/7 dias</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card variant="default" padding="default">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Mic className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">47min</p>
                <p className="text-xs text-muted-foreground">Falando hoje</p>
              </div>
            </div>
          </Card>
          <Card variant="default" padding="default">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-streak-fire/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-streak-fire" />
              </div>
              <div>
                <p className="text-2xl font-bold">+32%</p>
                <p className="text-xs text-muted-foreground">Fluência</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
