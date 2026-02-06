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
  Send
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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { 
    transcript, 
    isListening, 
    isSupported, 
    startListening, 
    stopListening,
    resetTranscript 
  } = useSpeechRecognition({
    language: 'en-US',
    continuous: true,
    onResult: (finalTranscript) => {
      if (finalTranscript.trim()) {
        addUserMessage(finalTranscript.trim());
        resetTranscript();
        setCurrentTranscript("");
      }
    },
    onError: (error) => {
      console.error("Speech recognition error:", error);
    }
  });

  // Update current transcript in real-time
  useEffect(() => {
    setCurrentTranscript(transcript);
  }, [transcript]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize with a greeting
  useEffect(() => {
    const greeting = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
    setMessages([{
      id: "initial",
      role: "assistant",
      content: greeting
    }]);
    startTimeRef.current = Date.now();
    
    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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
          body: JSON.stringify({ 
            text,
            voiceId: "EXAVITQu4vr4xnSDxMaL"
          }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        setPlayingId(null);
      };

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
    const minutesSpoken = Math.ceil(elapsedTime / 60);
    onComplete(minutesSpoken);
  };

  const handleRecordToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setCurrentTranscript("");
      startListening();
    }
  };

  const handleSendTranscript = () => {
    if (currentTranscript.trim()) {
      stopListening();
      addUserMessage(currentTranscript.trim());
      resetTranscript();
      setCurrentTranscript("");
    }
  };

  const addUserMessage = async (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content
    };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      // Build conversation history for AI
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('free-talk', {
        body: { 
          userMessage: content,
          conversationHistory
        }
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
      // Fallback response
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-card">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h1 className="font-semibold">Free Talk</h1>
          <p className="text-xs text-muted-foreground">{formatTime(elapsedTime)}</p>
        </div>
        <Button variant="soft" size="sm" onClick={handleFinish}>
          Finalizar
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        
        {/* Show current transcript while speaking */}
        {currentTranscript && (
          <div className="flex justify-end gap-2">
            <Card variant="default" padding="sm" className="max-w-[80%] bg-muted border-dashed">
              <p className="text-sm text-muted-foreground italic">{currentTranscript}...</p>
            </Card>
          </div>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <Card variant="default" padding="sm">
              <Loader2 className="w-4 h-4 animate-spin" />
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Recording Area */}
      <div className="border-t bg-card p-4">
        {!isSupported && (
          <p className="text-xs text-destructive text-center mb-2">
            Seu navegador não suporta reconhecimento de voz. Tente no Chrome.
          </p>
        )}
        
        <div className="mb-4">
          <WaveformVisualizer isActive={isListening} />
        </div>
        
        <div className="flex justify-center gap-4 items-center">
          <Button
            variant={isListening ? "record" : "hero"}
            size="icon-lg"
            className="w-16 h-16 rounded-full"
            onClick={handleRecordToggle}
            disabled={!isSupported}
          >
            {isListening ? (
              <Square className="w-7 h-7" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </Button>
          
          {currentTranscript && (
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
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          {isListening 
            ? "Ouvindo... toque para parar ou enviar" 
            : "Toque para falar"}
        </p>
      </div>
    </div>
  );
}
