import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import {
  ArrowLeft,
  Mic,
  Square,
  Send,
  Volume2,
  Loader2,
  Pause
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
  audioUrl?: string;
}

const conversationStarters = [
  "Hi! I'm here to have a casual conversation with you. What's on your mind today?",
  "Hey there! Let's practice some English. Tell me about your day so far.",
  "Hello! Ready for some free conversation? Pick any topic you'd like to discuss!",
];

export function FreeTalkFlow({ onBack, onComplete }: FreeTalkFlowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

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

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content
    };
    setMessages(prev => [...prev, newMessage]);

    // Simulate AI response (in production, this would call an AI endpoint)
    setTimeout(() => {
      const responses = [
        "That's really interesting! Tell me more about that.",
        "I understand. How does that make you feel?",
        "Great point! What do you think about...",
        "That sounds challenging. How are you handling it?",
        "Interesting perspective! Have you considered...",
      ];
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)]
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1500);
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
      </div>

      {/* Recording Area */}
      <div className="border-t bg-card p-4">
        <div className="mb-4">
          <WaveformVisualizer isActive={isRecording} />
        </div>
        
        <div className="flex justify-center gap-4">
          <Button
            variant={isRecording ? "record" : "hero"}
            size="icon-lg"
            className="w-16 h-16 rounded-full"
            onClick={() => {
              if (isRecording) {
                setIsRecording(false);
                // Simulate transcription
                addUserMessage("This is a simulated user response for the demo.");
              } else {
                setIsRecording(true);
              }
            }}
          >
            {isRecording ? (
              <Square className="w-7 h-7" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          {isRecording ? "Gravando... toque para enviar" : "Toque para falar"}
        </p>
      </div>
    </div>
  );
}
