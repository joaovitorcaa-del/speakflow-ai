import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  ArrowLeft,
  Headphones, 
  Mic, 
  MessageSquare, 
  Sparkles, 
  Target,
  BookOpen,
  TrendingUp,
  MessageCircle,
  Heart,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppPreviewCarouselProps {
  onComplete: () => void;
}

interface SlideContent {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

const slides: SlideContent[] = [
  {
    icon: <Zap className="w-8 h-8" />,
    iconBg: "bg-primary",
    title: "Destrave sua fala",
    subtitle: "O que é o SpeakDaily",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Este app foi criado para quem <strong className="text-foreground">entende inglês, mas trava na hora de falar</strong>.
        </p>
        <p className="text-muted-foreground">
          Aqui você não estuda gramática ou decora regras. Você aprende <strong className="text-foreground">falando</strong> — todos os dias, de forma leve e progressiva.
        </p>
        <div className="bg-muted/50 p-4 rounded-xl mt-4">
          <p className="text-sm italic text-muted-foreground">
            "Falar vem antes de falar perfeito."
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <Target className="w-8 h-8" />,
    iconBg: "bg-accent",
    title: "O Método",
    subtitle: "3 pilares simples",
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">1. Input</p>
            <p className="text-sm text-muted-foreground">Ouça inglês real em contextos práticos</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">2. Shadowing</p>
            <p className="text-sm text-muted-foreground">Repita frases curtas em voz alta</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Mic className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">3. Output</p>
            <p className="text-sm text-muted-foreground">Fale livremente — errar faz parte</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    iconBg: "bg-primary",
    title: "IA como Coach",
    subtitle: "Feedback personalizado",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          A IA não é uma professora rígida. Ela atua como <strong className="text-foreground">coach de fala</strong>.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xs">✓</span>
            </div>
            <span>Analisa cada fala individualmente</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xs">✓</span>
            </div>
            <span>Avalia fluidez, clareza e pronúncia</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xs">✓</span>
            </div>
            <span>Ajusta a dificuldade ao seu nível</span>
          </div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">
            Sem termos técnicos. Sem correções exaustivas. <strong className="text-foreground">Feedback humano e contextualizado.</strong>
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <Target className="w-8 h-8" />,
    iconBg: "bg-accent",
    title: "Desafio do Dia",
    subtitle: "15-25 minutos",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Todos os dias você recebe um <strong className="text-foreground">desafio personalizado</strong> com:
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 p-3 rounded-xl">
            <Headphones className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">Input</p>
          </div>
          <div className="bg-muted/50 p-3 rounded-xl">
            <MessageSquare className="w-5 h-5 mx-auto mb-1 text-accent" />
            <p className="text-xs font-medium">Shadowing</p>
          </div>
          <div className="bg-muted/50 p-3 rounded-xl">
            <Mic className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">Output</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          O importante é <strong className="text-foreground">falar todos os dias</strong>, mesmo que por poucos minutos.
        </p>
      </div>
    ),
  },
  {
    icon: <BookOpen className="w-8 h-8" />,
    iconBg: "bg-primary",
    title: "Vocabulário",
    subtitle: "3-5 palavras por dia",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Pequenas doses diárias de vocabulário:
        </p>
        <div className="bg-muted/50 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔊</span>
            <span className="text-sm">Áudio da pronúncia</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <span className="text-sm">Explicação simples em inglês</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">✍️</span>
            <span className="text-sm">Exemplo prático de uso</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Essas palavras não são para decorar — são para <strong className="text-foreground">usar enquanto você fala</strong>.
        </p>
      </div>
    ),
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    iconBg: "bg-accent",
    title: "Sua Jornada",
    subtitle: "Evolução por níveis",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Seu progresso é medido por <strong className="text-foreground">semanas consistentes</strong>, não dias isolados.
        </p>
        <div className="space-y-2">
          {[
            { level: "Starter Voice", color: "bg-muted" },
            { level: "Confident Speaker", color: "bg-primary/20" },
            { level: "Clear Communicator", color: "bg-primary/40" },
            { level: "Natural Conversationalist", color: "bg-accent/60" },
            { level: "Advanced Fluency", color: "bg-accent" },
          ].map((item, index) => (
            <div key={index} className={cn("p-2 rounded-lg text-sm flex items-center gap-2", item.color)}>
              <div className="w-4 h-4 rounded-full bg-background/50 flex items-center justify-center text-xs">
                {index + 1}
              </div>
              <span className={index >= 3 ? "text-accent-foreground" : ""}>{item.level}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Uma semana difícil não te penaliza. O método considera seu progresso ao longo do tempo.
        </p>
      </div>
    ),
  },
  {
    icon: <MessageCircle className="w-8 h-8" />,
    iconBg: "bg-primary",
    title: "Conversa Livre",
    subtitle: "Para ir além",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Além dos desafios, você pode praticar em <strong className="text-foreground">conversas abertas</strong> com a IA:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary">•</span>
            <span>Tema livre</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary">•</span>
            <span>Tempo flexível</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary">•</span>
            <span>Feedback ao final</span>
          </div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">
            Não é obrigatório, mas acelera ainda mais o progresso para quem quer se dedicar.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <Heart className="w-8 h-8" />,
    iconBg: "bg-accent",
    title: "Seu Compromisso",
    subtitle: "Consistência > Perfeição",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          O SpeakDaily não exige perfeição. Exige apenas <strong className="text-foreground">presença</strong>.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-lg">⏱️</span>
            </div>
            <span className="text-sm">Poucos minutos por dia</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
            <span className="text-sm">Constância acima de intensidade</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <span className="text-sm">Foco em falar, não em acertar tudo</span>
          </div>
        </div>
        <div className="bg-primary/10 p-4 rounded-xl mt-4">
          <p className="text-sm font-medium text-center">
            Fluência não acontece de uma vez.<br/>
            Ela surge quando você <strong>fala um pouco todos os dias</strong>.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <Zap className="w-8 h-8" />,
    iconBg: "bg-primary",
    title: "Pronto para começar?",
    subtitle: "A fluência vem no caminho",
    content: (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">
          Este app não promete atalhos. Ele oferece um <strong className="text-foreground">caminho claro, humano e sustentável</strong>.
        </p>
        <div className="py-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center shadow-glow">
            <Mic className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>
        <p className="text-lg font-semibold">
          Fale hoje. Fale amanhã.
        </p>
        <p className="text-muted-foreground">
          A fluência vem no caminho.
        </p>
      </div>
    ),
  },
];

export function AppPreviewCarousel({ onComplete }: AppPreviewCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress and skip */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === currentSlide 
                  ? "w-6 bg-primary" 
                  : i < currentSlide 
                    ? "w-3 bg-primary/60" 
                    : "w-3 bg-muted"
              )}
            />
          ))}
        </div>
        {!isLastSlide && (
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Pular
          </Button>
        )}
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col px-6 py-4 overflow-hidden">
        <div 
          key={currentSlide}
          className="flex-1 flex flex-col animate-fade-in-up"
        >
          {/* Icon */}
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-primary-foreground",
            slide.iconBg
          )}>
            {slide.icon}
          </div>

          {/* Title and subtitle */}
          {slide.subtitle && (
            <p className="text-sm text-muted-foreground mb-1">{slide.subtitle}</p>
          )}
          <h2 className="text-2xl font-bold mb-4">{slide.title}</h2>

          {/* Content */}
          <Card variant="default" padding="default" className="flex-1 overflow-y-auto">
            {slide.content}
          </Card>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="px-6 pb-8 pt-4 flex gap-3">
        {currentSlide > 0 && (
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrev}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Button
          variant="hero"
          size="lg"
          className="flex-1"
          onClick={handleNext}
        >
          {isLastSlide ? "Começar minha jornada" : "Continuar"}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
