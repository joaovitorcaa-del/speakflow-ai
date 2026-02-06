import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Lock, CheckCircle2, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyScreenProps {
  currentLevel: string;
  onBack: () => void;
}

interface FluencyLevel {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

const fluencyLevels: FluencyLevel[] = [
  {
    id: "starter",
    name: "Starter Voice",
    description: "Você está dando os primeiros passos na fala em inglês",
    requirements: [
      "Complete 3 desafios",
      "Fale por 30 minutos no total",
      "Mantenha 1 semana ativa"
    ],
    icon: <Star className="w-6 h-6" />,
    color: "text-accent",
    bgGradient: "from-accent/20 to-accent/5"
  },
  {
    id: "confident",
    name: "Confident Speaker",
    description: "Você já se sente mais seguro ao falar",
    requirements: [
      "Nota de fluência ≥ 60 por 2 semanas",
      "Fale por 120 minutos no total",
      "Complete 10 desafios"
    ],
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-primary",
    bgGradient: "from-primary/20 to-primary/5"
  },
  {
    id: "clear",
    name: "Clear Communicator",
    description: "Sua comunicação está cada vez mais clara",
    requirements: [
      "Nota de fluência ≥ 70 por 3 semanas",
      "Nota de clareza ≥ 65",
      "Fale por 300 minutos no total"
    ],
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-streak-fire",
    bgGradient: "from-streak-fire/20 to-streak-fire/5"
  },
  {
    id: "natural",
    name: "Natural Conversationalist",
    description: "Você conversa de forma natural e fluida",
    requirements: [
      "Nota de fluência ≥ 80 por 3 semanas",
      "Complete 50 desafios",
      "30 minutos de Free Talk"
    ],
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-medal-gold",
    bgGradient: "from-medal-gold/20 to-medal-gold/5"
  },
  {
    id: "fluent",
    name: "Advanced Fluency",
    description: "Você domina a comunicação em inglês com confiança",
    requirements: [
      "Nota de fluência ≥ 90 por 4 semanas",
      "Consistência de 85%+",
      "500 minutos de fala total"
    ],
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-medal-gold",
    bgGradient: "from-medal-gold/30 to-medal-gold/10"
  }
];

const levelOrder = ["starter", "confident", "clear", "natural", "fluent"];

export function JourneyScreen({ currentLevel, onBack }: JourneyScreenProps) {
  const currentLevelIndex = levelOrder.indexOf(currentLevel);
  
  const getLevelStatus = (levelIndex: number) => {
    if (levelIndex < currentLevelIndex) return "completed";
    if (levelIndex === currentLevelIndex) return "current";
    return "locked";
  };

  const getProgressToNext = () => {
    // Mock progress - in real app, calculate based on actual metrics
    return 45;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-secondary to-secondary/90 text-secondary-foreground px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon-sm"
            onClick={onBack}
            className="text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-secondary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sua Jornada</h1>
            <p className="text-secondary-foreground/70 text-sm">
              Evolua sua fluência passo a passo
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Current Level Highlight */}
        <Card className="mb-8 p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              {fluencyLevels[currentLevelIndex]?.icon}
            </div>
            <div>
              <Badge variant="secondary" className="mb-1">Nível atual</Badge>
              <h2 className="text-lg font-bold text-foreground">
                {fluencyLevels[currentLevelIndex]?.name || "Starter Voice"}
              </h2>
            </div>
          </div>
          
          {currentLevelIndex < levelOrder.length - 1 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso para próximo nível</span>
                <span className="font-semibold text-primary">{getProgressToNext()}%</span>
              </div>
              <Progress value={getProgressToNext()} className="h-2" />
            </div>
          )}
        </Card>

        {/* Journey Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {fluencyLevels.map((level, index) => {
              const status = getLevelStatus(index);
              const isLast = index === fluencyLevels.length - 1;
              
              return (
                <div key={level.id} className="relative pl-16">
                  {/* Timeline node */}
                  <div 
                    className={cn(
                      "absolute left-3 w-6 h-6 rounded-full flex items-center justify-center z-10 border-2",
                      status === "completed" && "bg-accent border-accent text-accent-foreground",
                      status === "current" && "bg-primary border-primary text-primary-foreground animate-pulse",
                      status === "locked" && "bg-muted border-border text-muted-foreground"
                    )}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : status === "locked" ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  
                  {/* Level card */}
                  <Card 
                    className={cn(
                      "p-4 transition-all",
                      status === "current" && `bg-gradient-to-br ${level.bgGradient} border-primary/30`,
                      status === "locked" && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold", level.color)}>
                          {level.name}
                        </span>
                        {status === "completed" && (
                          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent">
                            Conquistado
                          </Badge>
                        )}
                        {status === "current" && (
                          <Badge className="text-xs">
                            Em progresso
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {level.description}
                    </p>
                    
                    {/* Requirements */}
                    <div className="space-y-1.5">
                      {level.requirements.map((req, reqIndex) => (
                        <div 
                          key={reqIndex}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div 
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              status === "completed" ? "bg-accent" : "bg-muted-foreground/40"
                            )}
                          />
                          <span className={cn(
                            status === "completed" ? "text-muted-foreground line-through" : "text-muted-foreground"
                          )}>
                            {req}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Motivation footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Continue praticando para desbloquear novos níveis! 🚀
          </p>
          <p className="text-xs text-muted-foreground/70 italic max-w-xs mx-auto">
            Fluência não é um ponto final. É algo que se mantém.
          </p>
        </div>
      </div>
    </div>
  );
}
