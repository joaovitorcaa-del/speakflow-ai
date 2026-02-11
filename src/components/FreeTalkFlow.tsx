import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  ArrowLeft,
  Mic,
  Square,
  Volume2,
  Loader2,
  Pause,
  Send,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FreeTalkFlowProps {
  onBack: () => void;
  onComplete: (minutesSpoken: number) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sent?: boolean;
}

const conversationStarters = [
  "Hi! I'm here to have a casual conversation with you. What's on your mind today?",
  "Hey there! Let's practice some English. Tell me about your day so far.",
  "Hello! Ready for some free conversation? Pick any topic you'd like to discuss!",
];

export function FreeTalkFlow({ onBack, onComplete }: FreeTalkFlowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [speakingTime, setSpeakingTime] = useState(0); // actual speaking seconds
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingStartRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { 
    transcript, 
    isListening, 
    isSupported, 
    startListening, 
    stopListening,
    resetTranscript,
    permissionStatus,
    error: speechError
  } = useSpeechRecognition({
    language: 'en-US',
    continuous: true,
    onError: (error) => {
      console.error("Speech recognition error:", error);
      setMicStatus('error');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  useEffect(() => {
    const greeting = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
    setMessages([{ id: "initial", role: "assistant", content: greeting }]);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = async (text: string, messageId: string) => {
    if (isPlaying && playingId === messageId) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setPlayingId(null);
      return;
    }

    setIsLoading(true);
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
          body: JSON.stringify({ text, voiceId: "EXAVITQu4vr4xnSDxMaL" }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) audioRef.current.pause();

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => { setIsPlaying(false); setPlayingId(null); };
      setIsPlaying(true);
      setPlayingId(messageId);
      audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    const minutesSpoken = Math.max(1, Math.ceil(speakingTime / 60));
    onComplete(minutesSpoken);
  };

  const handleRecordToggle = async () => {
    if (isListening) {
      const finalText = await stopListening();
      const duration = (Date.now() - recordingStartRef.current) / 1000;
      setSpeakingTime(prev => prev + duration);
      
      const text = finalText.trim() || transcript.trim();
      if (text) {
        setMicStatus('processing');
        await addUserMessage(text);
        setMicStatus('idle');
      } else {
        setMicStatus('idle');
      }
      resetTranscript();
    } else {
      recordingStartRef.current = Date.now();
      setMicStatus('listening');
      const started = await startListening();
      if (!started) {
        setMicStatus('error');
      }
    }
  };

  const handleSendTranscript = async () => {
    if (transcript.trim()) {
      const finalText = await stopListening();
      const duration = (Date.now() - recordingStartRef.current) / 1000;
      setSpeakingTime(prev => prev + duration);
      
      const textToSend = finalText.trim() || transcript.trim();
      resetTranscript();
      setMicStatus('processing');
      await addUserMessage(textToSend);
      setMicStatus('idle');
    }
  };

  const addUserMessage = async (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      sent: true,
    };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('free-talk', {
        body: { userMessage: content, conversationHistory }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "That's interesting! Tell me more about that."
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const fallbackResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "That's really interesting! Can you tell me more about that?"
      };
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const getMicStatusText = () => {
    if (speechError || micStatus === 'error') {
      return permissionStatus === 'denied' 
        ? "Permissão de microfone negada" 
        : "Erro no microfone — tente novamente";
    }
    if (micStatus === 'processing') return "Processando...";
    if (isListening) return "Ouvindo... toque para enviar";
    return "Toque para falar";
  };

  const getMicStatusIcon = () => {
    if (speechError || micStatus === 'error') {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
    if (micStatus === 'processing') {
      return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
    }
    if (isListening) {
      return <CheckCircle2 className="w-4 h-4 text-accent" />;
    }
    return null;
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-card shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h1 className="font-semibold">Free Talk</h1>
          <p className="text-xs text-muted-foreground">
            🎙️ {formatTime(Math.round(speakingTime))} falados
          </p>
        </div>
        <Button variant="soft" size="sm" onClick={handleFinish}>
          Finalizar
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            Cada resposta é analisada individualmente pela IA
          </span>
        </div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <Card
              variant={message.role === "user" ? "primary" : "default"}
              padding="sm"
              className={cn(
                "max-w-[80%]",
                message.role === "user" && "bg-primary text-primary-foreground"
              )}
            >
              <p className="text-sm">{message.content}</p>
              {message.role === "user" && message.sent && (
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <CheckCircle2 className="w-3 h-3 opacity-70" />
                  <span className="text-[10px] opacity-70">Enviado</span>
                </div>
              )}
              {message.role === "assistant" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="mt-2 h-7 w-7"
                  onClick={() => playAudio(message.content, message.id)}
                  disabled={isLoading}
                >
                  {isLoading && playingId === message.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlaying && playingId === message.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </Card>
          </div>
        ))}
        
        {/* Current transcript */}
        {transcript && (
          <div className="flex justify-end gap-2">
            <Card variant="default" padding="sm" className="max-w-[80%] bg-muted border-dashed border-primary/30">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs text-muted-foreground">Ouvindo...</span>
              </div>
              <p className="text-sm text-foreground">{transcript}</p>
            </Card>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <Card variant="default" padding="sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Alex está digitando...</span>
              </div>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Recording Area */}
      <div className="border-t bg-card p-4 shrink-0">
        {!isSupported && (
          <div className="flex items-center justify-center gap-2 text-destructive mb-3 p-2 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <p className="text-xs">
              Seu navegador não suporta reconhecimento de voz. Tente no Chrome ou Safari.
            </p>
          </div>
        )}
        
        <div className="mb-4">
          <WaveformVisualizer isActive={isListening} />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-3">
          {getMicStatusIcon()}
          <span className={cn(
            "text-xs",
            (speechError || micStatus === 'error') ? "text-destructive" : "text-muted-foreground"
          )}>
            {getMicStatusText()}
          </span>
        </div>
        
        <div className="flex justify-center gap-4 items-center">
          <Button
            variant={isListening ? "record" : "hero"}
            size="icon-lg"
            className={cn("w-16 h-16 rounded-full", isListening && "animate-pulse-glow")}
            onClick={handleRecordToggle}
            disabled={!isSupported || micStatus === 'processing'}
          >
            {micStatus === 'processing' ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : isListening ? (
              <Square className="w-7 h-7" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </Button>
          
          {transcript && (
            <Button
              variant="hero"
              size="icon-lg"
              className="w-14 h-14 rounded-full"
              onClick={handleSendTranscript}
            >
              <Send className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
