import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ProgressBar";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  Square,
  Check,
  ChevronRight,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChallengeStep = "input" | "shadowing" | "output" | "feedback" | "complete";

interface ChallengeFlowProps {
  onBack: () => void;
  onComplete: () => void;
}

export function ChallengeFlow({ onBack, onComplete }: ChallengeFlowProps) {
  const [step, setStep] = useState<ChallengeStep>("input");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [shadowingIndex, setShadowingIndex] = useState(0);
  const [outputIndex, setOutputIndex] = useState(0);

  const shadowingSentences = [
    "I've been working at this company for about three years now.",
    "My main responsibilities include managing the marketing team.",
    "What I enjoy most is the creative problem-solving aspect.",
  ];

  const outputQuestions = [
    "Tell me about your current job or studies. What do you do?",
    "What's the most interesting project you've worked on recently?",
  ];

  const getProgress = () => {
    switch (step) {
      case "input": return 15;
      case "shadowing": return 30 + (shadowingIndex / shadowingSentences.length) * 30;
      case "output": return 60 + (outputIndex / outputQuestions.length) * 30;
      case "feedback": return 95;
      case "complete": return 100;
      default: return 0;
    }
  };

  const handleNextStep = () => {
    if (step === "input") setStep("shadowing");
    else if (step === "shadowing") {
      if (shadowingIndex < shadowingSentences.length - 1) {
        setShadowingIndex(prev => prev + 1);
      } else {
        setStep("output");
      }
    } else if (step === "output") {
      if (outputIndex < outputQuestions.length - 1) {
        setOutputIndex(prev => prev + 1);
      } else {
        setStep("feedback");
      }
    } else if (step === "feedback") {
      setStep("complete");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-4 border-b">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <ProgressBar progress={getProgress()} size="sm" animated={false} />
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {Math.round(getProgress())}%
        </span>
      </div>

      <div className="flex-1 flex flex-col px-6 py-6">
        {/* Input Block */}
        {step === "input" && (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-secondary-foreground text-sm font-bold">1</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">INPUT • 5 min</span>
            </div>
            <h2 className="text-2xl font-bold mb-6">Ouça e entenda</h2>

            {/* Video/Audio placeholder */}
            <Card variant="gradient" padding="none" className="aspect-video mb-6 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                <Button 
                  variant="hero" 
                  size="icon-lg"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                </Button>
              </div>
            </Card>

            <Card variant="default" padding="default" className="mb-auto">
              <p className="text-sm text-muted-foreground mb-2">Tema do dia</p>
              <h3 className="font-semibold mb-2">Descrevendo seu trabalho</h3>
              <p className="text-sm text-muted-foreground">
                Neste áudio, você vai ouvir alguém descrevendo seu trabalho, responsabilidades e o que mais gosta no que faz.
              </p>
            </Card>

            <Button variant="hero" size="xl" className="mt-6" onClick={handleNextStep}>
              Continuar para Shadowing
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Shadowing Block */}
        {step === "shadowing" && (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">2</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                SHADOWING • {shadowingIndex + 1}/{shadowingSentences.length}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6">Repita a frase</h2>

            {/* Sentence Card */}
            <Card variant="elevated" padding="lg" className="mb-6">
              <p className="text-xl font-medium text-center leading-relaxed">
                "{shadowingSentences[shadowingIndex]}"
              </p>
            </Card>

            {/* Audio Controls */}
            <div className="flex justify-center gap-4 mb-8">
              <Button variant="outline" size="icon-lg">
                <RotateCcw className="w-6 h-6" />
              </Button>
              <Button 
                variant="hero" 
                size="icon-lg"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
              </Button>
            </div>

            {/* Waveform */}
            <div className="mb-8">
              <WaveformVisualizer isActive={isRecording} />
            </div>

            {/* Recording button */}
            <div className="flex flex-col items-center gap-4 mb-auto">
              <Button
                variant={isRecording ? "record" : "soft"}
                size="icon-lg"
                className="w-20 h-20 rounded-full"
                onClick={() => setIsRecording(!isRecording)}
              >
                {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isRecording ? "Gravando... toque para parar" : "Toque para gravar sua voz"}
              </p>
            </div>

            <Button variant="hero" size="xl" className="mt-6" onClick={handleNextStep}>
              {shadowingIndex < shadowingSentences.length - 1 ? "Próxima frase" : "Continuar para Output"}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Output Block */}
        {step === "output" && (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-accent-foreground text-sm font-bold">3</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                OUTPUT • {outputIndex + 1}/{outputQuestions.length}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6">Agora é sua vez!</h2>

            {/* Question Card */}
            <Card variant="primary" padding="lg" className="mb-8">
              <p className="text-lg font-medium text-center">
                {outputQuestions[outputIndex]}
              </p>
            </Card>

            {/* Waveform */}
            <div className="mb-8">
              <WaveformVisualizer isActive={isRecording} />
            </div>

            {/* Recording button */}
            <div className="flex flex-col items-center gap-4 mb-auto">
              <Button
                variant={isRecording ? "record" : "hero"}
                size="icon-lg"
                className="w-24 h-24 rounded-full"
                onClick={() => setIsRecording(!isRecording)}
              >
                {isRecording ? <Square className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
              </Button>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {isRecording 
                  ? "Fale naturalmente... toque para finalizar" 
                  : "Responda em inglês, sem roteiro. Fale o que vier à mente!"}
              </p>
            </div>

            <Button 
              variant="hero" 
              size="xl" 
              className="mt-6" 
              onClick={handleNextStep}
            >
              {outputIndex < outputQuestions.length - 1 ? "Próxima pergunta" : "Ver feedback"}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Feedback Block */}
        {step === "feedback" && (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-6 text-center">Seu feedback</h2>

            <Card variant="success" padding="lg" className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Check className="w-6 h-6" />
                <span className="font-semibold">Ótimo trabalho!</span>
              </div>
              <p className="opacity-90">
                Você falou com continuidade e sua mensagem foi clara. Continue assim!
              </p>
            </Card>

            <Card variant="default" padding="default" className="mb-4">
              <h4 className="font-semibold mb-2 text-primary">🎯 Fluência</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Você manteve um bom ritmo. Tente conectar mais as palavras para soar mais natural.
              </p>
              <ProgressBar progress={75} size="sm" animated={false} />
            </Card>

            <Card variant="default" padding="default" className="mb-4">
              <h4 className="font-semibold mb-2 text-accent">🗣️ Pronúncia</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Atenção ao som do "th" em "three" — pratique com a língua entre os dentes.
              </p>
              <ProgressBar progress={68} size="sm" animated={false} />
            </Card>

            <Card variant="elevated" padding="default" className="mb-auto">
              <h4 className="font-semibold mb-2">💡 Sugestão</h4>
              <p className="text-sm text-muted-foreground italic">
                "I've been working here for about three years, and I really enjoy the creative challenges."
              </p>
            </Card>

            <Button variant="hero" size="xl" className="mt-6" onClick={handleNextStep}>
              Finalizar desafio
              <Check className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Complete */}
        {step === "complete" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-scale-in">
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center mb-6 shadow-card">
              <Check className="w-12 h-12 text-accent-foreground" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Parabéns! 🎉</h2>
            <p className="text-muted-foreground mb-8">
              Você completou o desafio de hoje.
            </p>

            <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">20min</p>
                <p className="text-xs text-muted-foreground">Falando</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">5</p>
                <p className="text-xs text-muted-foreground">Frases</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-streak-fire">8</p>
                <p className="text-xs text-muted-foreground">Dias seguidos</p>
              </div>
            </div>

            <Button variant="hero" size="xl" className="w-full max-w-sm" onClick={onComplete}>
              Voltar ao início
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
