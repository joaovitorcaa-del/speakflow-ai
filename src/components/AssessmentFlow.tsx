import { useState, useEffect, useCallback, useRef } from "react";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Volume2, Loader2, Sparkles, Trophy, Target, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AssessmentFlowProps {
  goal: string;
  onComplete: (level: string) => void;
  onBack: () => void;
}

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface Evaluation {
  level: string;
  feedback: string;
  strengths: string[];
  areasToImprove: string[];
  encouragement: string;
}

const levelLabels: Record<string, string> = {
  beginner: "Iniciante",
  elementary: "Básico",
  intermediate: "Intermediário",
  upper_intermediate: "Intermediário-Avançado",
  advanced: "Avançado",
};

const levelColors: Record<string, string> = {
  beginner: "from-orange-500 to-orange-600",
  elementary: "from-yellow-500 to-yellow-600",
  intermediate: "from-primary to-primary-glow",
  upper_intermediate: "from-accent to-green-500",
  advanced: "from-purple-500 to-purple-600",
};

export function AssessmentFlow({ goal, onComplete, onBack }: AssessmentFlowProps) {
  const [phase, setPhase] = useState<"intro" | "conversation" | "evaluating" | "result">("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAiMessage, setCurrentAiMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [transcript, setTranscript] = useState("");
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Text-to-Speech function using ElevenLabs
  const speakText = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text, 
            voiceId: "JBFqnCBsd6RMkjVDRZzb" // George - friendly male voice
          }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error("Error with ElevenLabs TTS:", error);
      setIsSpeaking(false);
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(prev => prev + finalTranscript);
      };
      
      recognition.onerror = (event: Event & { error?: string }) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        if (isRecording) {
          // Restart if still recording
          try {
            recognition.start();
          } catch (e) {
            console.error('Error restarting recognition:', e);
          }
        }
      };
      
      recognitionRef.current = recognition;
    }

    // Load voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isRecording]);

  // Start the assessment
  const startAssessment = async () => {
    setPhase("conversation");
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('assess-level', {
        body: { action: 'start', goal }
      });
      
      if (error) throw error;
      
      setCurrentAiMessage(data.message);
      setMessages([{ role: "assistant", content: data.message }]);
      setQuestionNumber(data.questionNumber);
      
      // Speak the message
      speakText(data.message);
    } catch (error) {
      console.error('Error starting assessment:', error);
      // Fallback message
      const fallbackMessage = "Hi there! I'm Alex, your English coach. Let's have a friendly chat. Tell me, what do you enjoy doing in your free time?";
      setCurrentAiMessage(fallbackMessage);
      setMessages([{ role: "assistant", content: fallbackMessage }]);
      setQuestionNumber(1);
      speakText(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      setTranscript("");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (e) {
          console.error('Error starting recognition:', e);
        }
      }
    }
  };

  // Send response
  const sendResponse = async () => {
    if (!transcript.trim()) return;
    
    // Stop any recording
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    }
    
    const userMessage = transcript.trim();
    setTranscript("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    
    try {
      const conversationHistory = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));
      
      const { data, error } = await supabase.functions.invoke('assess-level', {
        body: { 
          action: 'respond', 
          goal,
          userMessage,
          conversationHistory
        }
      });
      
      if (error) throw error;
      
      if (data.isComplete && data.evaluation) {
        // Evaluation complete
        setPhase("evaluating");
        
        // Short delay for effect
        setTimeout(() => {
          setEvaluation(data.evaluation);
          setPhase("result");
        }, 2000);
      } else {
        // Continue conversation
        setCurrentAiMessage(data.message);
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
        setQuestionNumber(data.questionNumber);
        speakText(data.message);
      }
    } catch (error) {
      console.error('Error sending response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Replay current message
  const replayMessage = () => {
    if (currentAiMessage) {
      speakText(currentAiMessage);
    }
  };

  // Complete and save
  const handleComplete = () => {
    if (evaluation) {
      onComplete(evaluation.level);
    }
  };

  // Intro screen
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-background flex flex-col px-6 py-8 animate-fade-in-up">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-8 shadow-glow animate-pulse">
            <Mic className="w-16 h-16 text-primary-foreground" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4">
            Vamos conversar!
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-sm">
            Você vai ter uma conversa rápida em inglês com Alex, nosso coach de IA. 
            São apenas 3 perguntas simples para entendermos seu nível.
          </p>
          
          <div className="space-y-3 w-full max-w-sm mb-8">
            <div className="flex items-center gap-3 text-left p-4 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">1</div>
              <p className="text-sm">Ouça a pergunta do Alex</p>
            </div>
            <div className="flex items-center gap-3 text-left p-4 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">2</div>
              <p className="text-sm">Responda em inglês (pode ser simples!)</p>
            </div>
            <div className="flex items-center gap-3 text-left p-4 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">3</div>
              <p className="text-sm">Receba seu nível personalizado</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            💡 Não se preocupe com erros - fale naturalmente!
          </p>
        </div>
        
        <div className="space-y-3">
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={startAssessment}
          >
            <Mic className="w-5 h-5" />
            Começar conversa
          </Button>
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={onBack}
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Conversation screen
  if (phase === "conversation") {
    return (
      <div className="min-h-screen bg-background flex flex-col px-6 py-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Pergunta {questionNumber} de 3</span>
            <span className="text-sm font-medium">{Math.round((questionNumber / 3) * 100)}%</span>
          </div>
          <Progress value={(questionNumber / 3) * 100} className="h-2" />
        </div>

        {/* AI Message */}
        <Card variant="gradient" padding="default" className="mb-6">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0",
              isSpeaking && "animate-pulse"
            )}>
              <Volume2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-muted-foreground mb-1">Alex</p>
              <p className="text-foreground">{currentAiMessage}</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={replayMessage}
            disabled={isSpeaking}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Ouvir novamente
          </Button>
        </Card>

        {/* Transcript display */}
        {(isRecording || transcript) && (
          <Card padding="sm" className="mb-6 border-2 border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Sua resposta:</p>
            <p className={cn(
              "min-h-[60px]",
              isRecording && "animate-pulse"
            )}>
              {transcript || "Escutando..."}
            </p>
          </Card>
        )}

        {/* Recording controls */}
        <div className="mt-auto space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                    isRecording
                      ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg scale-110"
                      : "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow hover:scale-105"
                  )}
                >
                  {isRecording ? (
                    <MicOff className="w-10 h-10" />
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                </button>
              </div>
              
              <p className="text-center text-sm text-muted-foreground">
                {isRecording ? "Toque para parar" : "Toque para falar"}
              </p>
              
              {transcript && !isRecording && (
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  onClick={sendResponse}
                >
                  Enviar resposta
                  <ArrowRight className="w-5 h-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Evaluating screen
  if (phase === "evaluating") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-8 animate-pulse shadow-glow">
          <Sparkles className="w-12 h-12 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-4 animate-fade-in-up">Analisando...</h2>
        <p className="text-muted-foreground animate-fade-in-up">Nossa IA está avaliando sua conversa</p>
      </div>
    );
  }

  // Result screen
  if (phase === "result" && evaluation) {
    const levelColor = levelColors[evaluation.level] || levelColors.intermediate;
    
    return (
      <div className="min-h-screen bg-background flex flex-col px-6 py-8 animate-fade-in-up">
        <div className="flex-1 flex flex-col">
          {/* Level badge */}
          <div className="text-center mb-8">
            <div className={cn(
              "inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br mb-4 shadow-glow",
              levelColor
            )}>
              <Trophy className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {levelLabels[evaluation.level] || "Intermediário"}
            </h2>
            <p className="text-muted-foreground">Seu nível de inglês atual</p>
          </div>

          {/* Feedback card */}
          <Card variant="gradient" padding="default" className="mb-4">
            <p className="text-foreground leading-relaxed">{evaluation.feedback}</p>
          </Card>

          {/* Strengths */}
          <Card padding="default" className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-accent" />
              <h3 className="font-semibold">Seus pontos fortes</h3>
            </div>
            <ul className="space-y-2">
              {evaluation.strengths.map((strength, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {strength}
                </li>
              ))}
            </ul>
          </Card>

          {/* Areas to improve */}
          <Card padding="default" className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Próximos passos</h3>
            </div>
            <ul className="space-y-2">
              {evaluation.areasToImprove.map((area, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {area}
                </li>
              ))}
            </ul>
          </Card>

          {/* Encouragement */}
          <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-2xl p-4 mb-6">
            <p className="text-center font-medium text-primary">
              ✨ {evaluation.encouragement}
            </p>
          </div>
        </div>

        <Button
          variant="hero"
          size="xl"
          className="w-full"
          onClick={handleComplete}
        >
          Começar minha jornada
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return null;
}
