import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
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
    icon: <Zap className="w-7 h-7" />,
    iconBg: "bg-primary",
    title: "Destrave sua fala",
    subtitle: "O que é o SpeakDaily",
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Criado para quem <strong className="text-foreground">entende inglês, mas trava na hora de falar</strong>.
        </p>
        <p className="text-muted-foreground text-sm">
          Aqui você aprende <strong className="text-foreground">falando</strong> — todos os dias, de forma leve e progressiva.
        </p>
        <div className="bg-muted/50 p-3 rounded-xl">
          <p className="text-xs italic text-muted-foreground">"Falar vem antes de falar perfeito."</p>
        </div>
      </div>
    ),
  },
  {
    icon: <Target className="w-7 h-7" />,
    iconBg: "bg-accent",
    title: "O Método",
    subtitle: "3 pilares simples",
    content: (
      <div className="space-y-3">
        {[
          { Icon: Headphones, bg: "bg-primary/20", color: "text-primary", label: "1. Input", desc: "Ouça inglês real em contextos práticos" },
          { Icon: MessageSquare, bg: "bg-accent/20", color: "text-accent", label: "2. Shadowing", desc: "Repita frases curtas em voz alta" },
          { Icon: Mic, bg: "bg-primary/20", color: "text-primary", label: "3. Output", desc: "Fale livremente — errar faz parte" },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", item.bg)}>
              <item.Icon className={cn("w-4 h-4", item.color)} />
            </div>
            <div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <Sparkles className="w-7 h-7" />,
    iconBg: "bg-primary",
    title: "IA como Coach",
    subtitle: "Feedback personalizado",
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          A IA atua como <strong className="text-foreground">coach de fala</strong>, não professora rígida.
        </p>
        <div className="space-y-2">
          {["Analisa cada fala individualmente", "Avalia fluidez, clareza e pronúncia", "Ajusta a dificuldade ao seu nível"].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent text-[10px]">✓</span>
              </div>
              <span className="text-sm">{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <Target className="w-7 h-7" />,
    iconBg: "bg-accent",
    title: "Desafio do Dia",
    subtitle: "15-25 minutos",
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Todo dia um <strong className="text-foreground">desafio personalizado</strong>:
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { Icon: Headphones, label: "Input", color: "text-primary" },
            { Icon: MessageSquare, label: "Shadowing", color: "text-accent" },
            { Icon: Mic, label: "Output", color: "text-primary" },
          ].map((b, i) => (
            <div key={i} className="bg-muted/50 p-3 rounded-xl">
              <b.Icon className={cn("w-5 h-5 mx-auto mb-1", b.color)} />
              <p className="text-xs font-medium">{b.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          O importante é <strong className="text-foreground">falar todos os dias</strong>.
        </p>
      </div>
    ),
  },
  {
    icon: <BookOpen className="w-7 h-7" />,
    iconBg: "bg-primary",
    title: "Vocabulário",
    subtitle: "3-5 palavras por dia",
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">Pequenas doses diárias:</p>
        <div className="bg-muted/50 p-3 rounded-xl space-y-2">
          {[
            { emoji: "🔊", text: "Áudio da pronúncia" },
            { emoji: "💡", text: "Explicação simples em inglês" },
            { emoji: "✍️", text: "Exemplo prático de uso" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg">{item.emoji}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <TrendingUp className="w-7 h-7" />,
    iconBg: "bg-accent",
    title: "Sua Jornada",
    subtitle: "Evolução por níveis",
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs">
          Progresso medido por <strong className="text-foreground">semanas consistentes</strong>.
        </p>
        <div className="space-y-1.5">
          {[
            { level: "Starter Voice", color: "bg-muted" },
            { level: "Confident Speaker", color: "bg-primary/20" },
            { level: "Clear Communicator", color: "bg-primary/40" },
            { level: "Natural Conversationalist", color: "bg-accent/60" },
            { level: "Advanced Fluency", color: "bg-accent" },
          ].map((item, index) => (
            <div key={index} className={cn("p-2 rounded-lg text-xs flex items-center gap-2", item.color)}>
              <div className="w-4 h-4 rounded-full bg-background/50 flex items-center justify-center text-[10px]">
                {index + 1}
              </div>
              <span className={index >= 3 ? "text-accent-foreground" : ""}>{item.level}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <MessageCircle className="w-7 h-7" />,
    iconBg: "bg-primary",
    title: "Conversa Livre",
    subtitle: "Para ir além",
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Pratique em <strong className="text-foreground">conversas abertas</strong> com a IA:
        </p>
        <div className="space-y-2">
          {["Tema livre", "Tempo flexível", "Feedback ao final"].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-primary">•</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <Heart className="w-7 h-7" />,
    iconBg: "bg-accent",
    title: "Seu Compromisso",
    subtitle: "Consistência > Perfeição",
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Exige apenas <strong className="text-foreground">presença</strong>.
        </p>
        <div className="space-y-2">
          {[
            { emoji: "⏱️", text: "Poucos minutos por dia" },
            { emoji: "📈", text: "Constância acima de intensidade" },
            { emoji: "🎯", text: "Foco em falar, não em acertar tudo" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-base">{item.emoji}</span>
              </div>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <Zap className="w-7 h-7" />,
    iconBg: "bg-primary",
    title: "Pronto para começar?",
    subtitle: "A fluência vem no caminho",
    content: (
      <div className="space-y-3 text-center">
        <p className="text-muted-foreground text-sm">
          Um <strong className="text-foreground">caminho claro, humano e sustentável</strong>.
        </p>
        <div className="py-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center shadow-glow">
            <Mic className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <p className="text-base font-semibold">Fale hoje. Fale amanhã.</p>
        <p className="text-muted-foreground text-sm">A fluência vem no caminho.</p>
      </div>
    ),
  },
];

export function AppPreviewCarousel({ onComplete }: AppPreviewCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const isLastSlide = currentSlide === slides.length - 1;

  const goTo = (index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, slides.length - 1)));
  };

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentSlide < slides.length - 1) goTo(currentSlide + 1);
      else if (diff < 0 && currentSlide > 0) goTo(currentSlide - 1);
    }
    isDragging.current = false;
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with skip */}
      <div className="flex items-center justify-end px-6 pt-6 pb-2">
        {!isLastSlide && (
          <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground">
            Pular
          </Button>
        )}
      </div>

      {/* Centered card carousel */}
      <div 
        className="flex-1 flex items-center justify-center px-6 py-4"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Card 
          key={currentSlide}
          variant="elevated" 
          padding="lg" 
          className="w-full max-w-sm animate-fade-in-up"
        >
          {/* Card header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground",
              slide.iconBg
            )}>
              {slide.icon}
            </div>
            <div>
              {slide.subtitle && (
                <p className="text-xs text-muted-foreground">{slide.subtitle}</p>
              )}
              <h2 className="text-xl font-bold">{slide.title}</h2>
            </div>
          </div>

          {/* Card content */}
          <div className="min-h-[200px]">
            {slide.content}
          </div>

          {/* Progress dots inside card */}
          <div className="flex justify-center gap-1.5 mt-4 pt-4 border-t border-border/50">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentSlide 
                    ? "w-6 bg-primary" 
                    : i < currentSlide 
                      ? "w-2 bg-primary/50" 
                      : "w-2 bg-muted"
                )}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom button */}
      <div className="px-6 pb-8 pt-2">
        {isLastSlide ? (
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={onComplete}
          >
            Começar minha jornada
            <ArrowRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="soft"
            size="lg"
            className="w-full"
            onClick={() => goTo(currentSlide + 1)}
          >
            Continuar
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
