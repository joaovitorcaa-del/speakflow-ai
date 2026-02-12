import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ProgressBar";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { ConfettiEffect } from "@/components/ConfettiEffect";
import { AnalysisAnimation } from "@/components/AnalysisAnimation";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  Square,
  Check,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Loader2,
  AlertCircle,
  Quote,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ChallengeStep = "input" | "shadowing" | "output" | "feedback" | "complete";

interface ChallengeFlowProps {
  onBack: () => void;
  onComplete: (speakingMinutes: number, completionPercentage: number) => void;
  isFixation?: boolean;
  resumeSession?: {
    current_step: string;
    current_index: number;
    transcriptions: string[];
    speaking_seconds: number;
    steps_completed: StepsCompleted;
  } | null;
}

interface SpeechEvaluation {
  positiveReinforcement: string;
  fluencyNote: string;
  pronunciationTip: string;
  naturalPhrase: {
    original: string;
    improved: string;
  } | null;
  scores: {
    fluency: number;
    clarity: number;
    confidence: number;
  };
  encouragement: string;
}

interface ShadowingFeedback {
  feedback: string;
  tip: string | null;
  accuracy: number;
}

interface OutputFeedback {
  suggestion: string;
  correction: string | null;
}

interface StepsCompleted {
  inputListened: boolean;
  shadowingRecorded: boolean[];
  outputRecorded: boolean[];
}

interface ChallengeContent {
  title: string;
  inputText: string;
  shadowingSentences: string[];
  questions: string[];
}

export function ChallengeFlow({ onBack, onComplete, isFixation = false, resumeSession }: ChallengeFlowProps) {
  const { profile } = useProfile();
  const { user } = useAuth();

  const currentGoal = profile?.goal || 'conversation';
  const currentLevel = profile?.level || 'beginner';

  // Dynamic content state
  const [challengeContent, setChallengeContent] = useState<ChallengeContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);

  const shadowingSentences = challengeContent?.shadowingSentences || [];
  const questions = challengeContent?.questions || [];

  // State - possibly resumed
  const [step, setStep] = useState<ChallengeStep>((resumeSession?.current_step as ChallengeStep) || "input");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [shadowingIndex, setShadowingIndex] = useState(
    resumeSession?.current_step === 'shadowing' ? (resumeSession?.current_index || 0) : 0
  );
  const [outputIndex, setOutputIndex] = useState(
    resumeSession?.current_step === 'output' ? (resumeSession?.current_index || 0) : 0
  );
  const [allTranscriptions, setAllTranscriptions] = useState<string[]>(resumeSession?.transcriptions || []);
  const [shadowingFeedback, setShadowingFeedback] = useState<ShadowingFeedback | null>(null);
  const [evaluation, setEvaluation] = useState<SpeechEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showAnalysisAnimation, setShowAnalysisAnimation] = useState(false);
  const [speakingDuration, setSpeakingDuration] = useState(resumeSession?.speaking_seconds || 0);
  const [audioConfirmed, setAudioConfirmed] = useState(false);
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);
  const [outputFeedback, setOutputFeedback] = useState<OutputFeedback | null>(null);
  const [isGettingOutputFeedback, setIsGettingOutputFeedback] = useState(false);
  const recordingStartRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, string>>(new Map());

  // Steps completed tracking - initialized after content loads
  const [stepsCompleted, setStepsCompleted] = useState<StepsCompleted>(
    resumeSession?.steps_completed || {
      inputListened: false,
      shadowingRecorded: [],
      outputRecorded: [],
    }
  );

  // Load challenge content
  useEffect(() => {
    const loadContent = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];

      try {
        // Check for cached content in challenge_sessions
        const { data: session } = await supabase
          .from('challenge_sessions')
          .select('challenge_content')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (session?.challenge_content) {
          const cached = session.challenge_content as unknown as ChallengeContent;
          setChallengeContent(cached);
          if (!resumeSession) {
            setStepsCompleted({
              inputListened: false,
              shadowingRecorded: new Array(cached.shadowingSentences.length).fill(false),
              outputRecorded: new Array(cached.questions.length).fill(false),
            });
          }
          setIsLoadingContent(false);
          return;
        }

        // Fetch vocabulary words
        const { data: vocabData } = await supabase
          .from('vocabulary_words')
          .select('word')
          .eq('user_id', user.id)
          .eq('is_confident', true)
          .order('updated_at', { ascending: false })
          .limit(20);

        const vocabWords = (vocabData || []).map(v => v.word);

        // Generate new content
        const { data, error } = await supabase.functions.invoke('generate-challenge', {
          body: { goal: currentGoal, level: currentLevel, date: today, vocabularyWords: vocabWords }
        });

        if (error) throw error;

        setChallengeContent(data);
        setStepsCompleted({
          inputListened: false,
          shadowingRecorded: new Array(data.shadowingSentences.length).fill(false),
          outputRecorded: new Array(data.questions.length).fill(false),
        });

        // Cache in challenge_sessions
        await supabase.from('challenge_sessions').upsert({
          user_id: user.id,
          date: today,
          challenge_content: data as any,
          current_step: 'input',
          current_index: 0,
        }, { onConflict: 'user_id,date' });
      } catch (err) {
        console.error('[ChallengeFlow] Error loading content:', err);
        setContentError('Erro ao gerar desafio. Tente novamente.');
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadContent();
  }, [user, currentGoal, currentLevel]);

  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error: speechError
  } = useSpeechRecognition({
    language: 'en-US',
    continuous: true,
  });

  // Calculate completion percentage
  const getCompletionPercentage = useCallback(() => {
    const inputWeight = 1;
    const shadowingWeight = shadowingSentences.length;
    const outputWeight = questions.length;
    const total = inputWeight + shadowingWeight + outputWeight;

    let completed = stepsCompleted.inputListened ? 1 : 0;
    completed += stepsCompleted.shadowingRecorded.filter(Boolean).length;
    completed += stepsCompleted.outputRecorded.filter(Boolean).length;

    return Math.round((completed / total) * 100);
  }, [stepsCompleted, shadowingSentences.length, questions.length]);

  const getProgress = () => {
    switch (step) {
      case "input": return 10;
      case "shadowing": return 20 + (shadowingIndex / shadowingSentences.length) * 30;
      case "output": return 50 + (outputIndex / Math.max(1, questions.length)) * 35;
      case "feedback": return 90;
      case "complete": return 100;
      default: return 0;
    }
  };

  // Save session to DB
  const saveSession = useCallback(async () => {
    if (!user || isFixation) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        user_id: user.id,
        date: today,
        current_step: step,
        current_index: step === 'shadowing' ? shadowingIndex : step === 'output' ? outputIndex : 0,
        transcriptions: JSON.parse(JSON.stringify(allTranscriptions)),
        speaking_seconds: Math.round(speakingDuration),
        steps_completed: JSON.parse(JSON.stringify(stepsCompleted)),
        completed: step === 'complete',
      };
      await supabase.from('challenge_sessions').upsert(payload, { onConflict: 'user_id,date' });
    } catch (err) {
      console.error('[ChallengeFlow] Save session error:', err);
    }
  }, [user, isFixation, step, shadowingIndex, outputIndex, allTranscriptions, speakingDuration, stepsCompleted]);

  // Auto-save on step/index change
  useEffect(() => {
    saveSession();
  }, [step, shadowingIndex, outputIndex]);

  const playWithElevenLabs = async (text: string) => {
    const cachedUrl = audioCache.current.get(text);
    if (cachedUrl) {
      playAudioUrl(cachedUrl);
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

      if (!response.ok) throw new Error(`TTS request failed: ${response.status}`);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioCache.current.set(text, audioUrl);
      playAudioUrl(audioUrl);
    } catch (error) {
      console.error("Error generating speech:", error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const playAudioUrl = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.onloadeddata = () => setIsLoading(false);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      audio.src = '';
      audioRef.current = null;
      if (step === 'input') {
        setStepsCompleted(prev => ({ ...prev, inputListened: true }));
      }
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    setIsPlaying(true);
    audio.play().catch(err => {
      console.error("Playback error:", err);
      setIsPlaying(false);
      setIsLoading(false);
    });
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const playInputAudio = () => {
    if (isPlaying) { stopAudio(); return; }
    playWithElevenLabs(challengeContent?.inputText || '');
  };

  const playShadowingSentence = () => {
    if (isPlaying) { stopAudio(); return; }
    playWithElevenLabs(shadowingSentences[shadowingIndex]);
  };

  useEffect(() => {
    return () => {
      stopAudio();
      audioCache.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    stopAudio();
    setShadowingFeedback(null);
    setAudioConfirmed(false);
    setTranscriptionFailed(false);
    setOutputFeedback(null);
  }, [step, shadowingIndex, outputIndex]);

  const handleRecordToggle = async () => {
    if (isRecording || isListening) {
      const finalText = await stopListening();
      setIsRecording(false);
      
      const duration = (Date.now() - recordingStartRef.current) / 1000;
      setSpeakingDuration(prev => prev + duration);

      const text = finalText.trim() || transcript.trim();
      if (text) {
        setAllTranscriptions(prev => [...prev, text]);
        setAudioConfirmed(true);
        
        if (step === "shadowing") {
          setStepsCompleted(prev => {
            const newShadowing = [...prev.shadowingRecorded];
            newShadowing[shadowingIndex] = true;
            return { ...prev, shadowingRecorded: newShadowing };
          });
          getShadowingFeedback(text, shadowingSentences[shadowingIndex]);
        }

        if (step === "output") {
          setStepsCompleted(prev => {
            const newOutput = [...prev.outputRecorded];
            newOutput[outputIndex] = true;
            return { ...prev, outputRecorded: newOutput };
          });
          getOutputFeedback(text, questions[outputIndex]);
        }
      } else {
        setTranscriptionFailed(true);
      }
      resetTranscript();
    } else {
      // Stop any playing audio before starting mic (iOS audio session fix)
      if (isPlaying) stopAudio();
      recordingStartRef.current = Date.now();
      const started = await startListening();
      if (started) {
        setIsRecording(true);
        setShadowingFeedback(null);
        setAudioConfirmed(false);
        setTranscriptionFailed(false);
        setOutputFeedback(null);
      }
    }
  };

  const getShadowingFeedback = async (userText: string, targetSentence: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('shadowing-feedback', {
        body: { userTranscription: userText, targetSentence }
      });
      if (!error && data) setShadowingFeedback(data);
    } catch (err) {
      console.error("Error getting shadowing feedback:", err);
    }
  };

  const getOutputFeedback = async (userText: string, question: string) => {
    setIsGettingOutputFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-speech', {
        body: {
          transcription: userText,
          context: `Question: "${question}" | Theme: ${challengeContent?.title || ''}`,
          challengeType: 'output-phrase',
          speakingDurationSeconds: 30
        }
      });
      if (!error && data?.evaluation) {
        setOutputFeedback({
          suggestion: data.evaluation.naturalPhrase 
            ? `✨ "${data.evaluation.naturalPhrase.improved}"` 
            : data.evaluation.fluencyNote,
          correction: data.evaluation.pronunciationTip || null,
        });
      }
    } catch (err) {
      console.error("Error getting output feedback:", err);
    } finally {
      setIsGettingOutputFeedback(false);
    }
  };

  const evaluateSpeech = async () => {
    setIsEvaluating(true);
    const fullTranscription = allTranscriptions.join(' ');
    
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-speech', {
        body: {
          transcription: fullTranscription,
          context: challengeContent?.title || '',
          challengeType: 'daily-challenge',
          speakingDurationSeconds: Math.round(speakingDuration)
        }
      });

      if (!error && data?.evaluation) {
        setEvaluation(data.evaluation);
      } else {
        setEvaluation({
          positiveReinforcement: "Ótimo trabalho! Você se expressou com clareza.",
          fluencyNote: "Continue praticando para desenvolver ainda mais sua fluência.",
          pronunciationTip: "Preste atenção na entonação das perguntas.",
          naturalPhrase: null,
          scores: { fluency: 70, clarity: 75, confidence: 65 },
          encouragement: "Cada prática te deixa mais confiante!"
        });
      }
    } catch (err) {
      console.error("Error evaluating speech:", err);
      setEvaluation({
        positiveReinforcement: "Parabéns por completar o desafio!",
        fluencyNote: "Você está no caminho certo.",
        pronunciationTip: "",
        naturalPhrase: null,
        scores: { fluency: 65, clarity: 70, confidence: 60 },
        encouragement: "Continue praticando!"
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handlePreviousStep = () => {
    if (step === 'shadowing' && shadowingIndex > 0) {
      setShadowingIndex(prev => prev - 1);
    } else if (step === 'output') {
      if (outputIndex > 0) {
        setOutputIndex(prev => prev - 1);
      } else {
        // Back to last shadowing sentence
        setStep('shadowing');
        setShadowingIndex(shadowingSentences.length - 1);
      }
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
      if (outputIndex < questions.length - 1) {
        setOutputIndex(prev => prev + 1);
      } else {
        setShowAnalysisAnimation(true);
        evaluateSpeech();
        setStep("feedback");
      }
    } else if (step === "feedback") {
      setStep("complete");
    }
  };

  const completionPct = getCompletionPercentage();
  const canFinish = allTranscriptions.length > 0 && speakingDuration >= 10;

  // Loading state for dynamic content
  if (isLoadingContent) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">Gerando seu desafio do dia...</p>
      </div>
    );
  }

  if (contentError || !challengeContent) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
        <AlertCircle className="w-10 h-10 text-destructive mb-4" />
        <p className="text-foreground font-medium mb-2">Erro ao carregar desafio</p>
        <p className="text-muted-foreground text-sm text-center mb-6">{contentError || 'Conteúdo indisponível'}</p>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-4 border-b shrink-0">
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

      {isFixation && (
        <div className="bg-muted border-b border-border px-4 py-2 text-center text-xs text-muted-foreground shrink-0">
          📖 Exercício de fixação — não será contabilizado
        </div>
      )}

      <div className="flex-1 flex flex-col px-4 py-6 max-w-full overflow-x-hidden">
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

            <Card variant="gradient" padding="none" className="aspect-video mb-6 overflow-hidden max-w-full">
              <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                <Button 
                  variant="hero" 
                  size="icon-lg"
                  onClick={playInputAudio}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8" />
                  )}
                </Button>
              </div>
            </Card>

            <Card variant="default" padding="default" className="mb-auto">
              <p className="text-sm text-muted-foreground mb-2">Tema do dia</p>
              <h3 className="font-semibold mb-2">{challengeContent?.title}</h3>
              <p className="text-sm text-muted-foreground">
                Ouça com atenção e prepare-se para praticar frases relacionadas ao tema.
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

            <Card variant="elevated" padding="lg" className="mb-4">
              <p className="text-lg font-medium text-center leading-relaxed">
                "{shadowingSentences[shadowingIndex]}"
              </p>
            </Card>

            {/* Transcription failed */}
            {transcriptionFailed && !audioConfirmed && !isRecording && !isListening && (
              <Card variant="default" padding="sm" className="mb-4 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600">Não foi possível capturar sua fala. Tente novamente.</span>
                </div>
              </Card>
            )}

            {/* Audio confirmed */}
            {audioConfirmed && !shadowingFeedback && (
              <Card variant="default" padding="sm" className="mb-4 border-accent/30 bg-accent/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Áudio recebido ✓</span>
                </div>
              </Card>
            )}

            {/* Shadowing Feedback */}
            {shadowingFeedback && (
              <Card variant="default" padding="sm" className="mb-4 border-accent/30 bg-accent/5">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-accent mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-accent">{shadowingFeedback.feedback}</p>
                    {shadowingFeedback.tip && (
                      <p className="text-xs text-muted-foreground mt-1">💡 {shadowingFeedback.tip}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Live transcript */}
            {transcript && (
              <Card variant="default" padding="sm" className="mb-4 border-dashed border-primary/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs text-muted-foreground">Ouvindo...</span>
                </div>
                <p className="text-sm">{transcript}</p>
              </Card>
            )}

            {/* Audio Controls */}
            <div className="flex justify-center gap-4 mb-6">
              <Button variant="outline" size="icon-lg" onClick={() => { setShadowingFeedback(null); setAudioConfirmed(false); }}>
                <RotateCcw className="w-6 h-6" />
              </Button>
              <Button 
                variant="hero" 
                size="icon-lg"
                onClick={playShadowingSentence}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Volume2 className="w-8 h-8" />
                )}
              </Button>
            </div>

            <div className="mb-6">
              <WaveformVisualizer isActive={isRecording || isListening} />
            </div>

            <div className="flex flex-col items-center gap-3 mb-auto">
              <Button
                variant={isRecording || isListening ? "record" : "soft"}
                size="icon-lg"
                className="w-20 h-20 rounded-full"
                onClick={handleRecordToggle}
                disabled={!isSupported}
              >
                {isRecording || isListening ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isRecording || isListening ? "Gravando... toque para parar" : "Toque para gravar sua voz"}
              </p>
              {speechError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {speechError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {shadowingIndex > 0 && (
                <Button variant="outline" size="xl" onClick={handlePreviousStep}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <Button 
                variant={stepsCompleted.shadowingRecorded[shadowingIndex] ? "hero" : "outline"} 
                size="xl" 
                className="flex-1" 
                onClick={handleNextStep}
              >
                {stepsCompleted.shadowingRecorded[shadowingIndex]
                  ? (shadowingIndex < shadowingSentences.length - 1 ? "Próxima frase" : "Continuar para Output")
                  : "Pular"
                }
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
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
                OUTPUT • {outputIndex + 1}/{questions.length}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6">Agora é sua vez!</h2>

            <Card variant="primary" padding="lg" className="mb-6 max-w-full">
              <p className="text-lg font-medium text-center">
                {questions[outputIndex]}
              </p>
            </Card>

            {/* Transcription failed */}
            {transcriptionFailed && !audioConfirmed && !isRecording && !isListening && (
              <Card variant="default" padding="sm" className="mb-4 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600">Não foi possível capturar sua fala. Tente novamente.</span>
                </div>
              </Card>
            )}

            {/* Audio confirmed */}
            {audioConfirmed && !outputFeedback && !isGettingOutputFeedback && (
              <Card variant="default" padding="sm" className="mb-4 border-accent/30 bg-accent/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Áudio recebido ✓</span>
                </div>
              </Card>
            )}

            {/* Getting feedback */}
            {isGettingOutputFeedback && (
              <Card variant="default" padding="sm" className="mb-4 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analisando sua resposta...</span>
                </div>
              </Card>
            )}

            {/* Per-phrase output feedback */}
            {outputFeedback && (
              <Card variant="default" padding="sm" className="mb-4 border-accent/30 bg-accent/5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-accent">Áudio recebido ✓</p>
                    <p className="text-sm text-foreground mt-1">{outputFeedback.suggestion}</p>
                    {outputFeedback.correction && (
                      <p className="text-xs text-muted-foreground mt-1">💡 {outputFeedback.correction}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Live transcript */}
            {transcript && (
              <Card variant="default" padding="sm" className="mb-4 border-dashed border-primary/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs text-muted-foreground">Sua resposta...</span>
                </div>
                <p className="text-sm">{transcript}</p>
              </Card>
            )}

            <div className="mb-6">
              <WaveformVisualizer isActive={isRecording || isListening} />
            </div>

            <div className="flex flex-col items-center gap-3 mb-auto">
              <Button
                variant={isRecording || isListening ? "record" : "hero"}
                size="icon-lg"
                className="w-24 h-24 rounded-full"
                onClick={handleRecordToggle}
                disabled={!isSupported}
              >
                {isRecording || isListening ? <Square className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
              </Button>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {isRecording || isListening
                  ? "Fale naturalmente... toque para finalizar" 
                  : "Responda em inglês, sem roteiro. Fale o que vier à mente!"}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" size="xl" onClick={handlePreviousStep}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button 
                variant={stepsCompleted.outputRecorded[outputIndex] ? "hero" : "outline"} 
                size="xl" 
                className="flex-1" 
                onClick={handleNextStep}
              >
                {stepsCompleted.outputRecorded[outputIndex]
                  ? (outputIndex < questions.length - 1 ? "Próxima pergunta" : "Ver feedback")
                  : (outputIndex < questions.length - 1 ? "Pular pergunta" : "Ver feedback")
                }
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Feedback Block */}
        {step === "feedback" && (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            {showAnalysisAnimation && isEvaluating ? (
              <AnalysisAnimation onComplete={() => setShowAnalysisAnimation(false)} />
            ) : isEvaluating ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Finalizando análise...</p>
                </div>
              </div>
            ) : evaluation ? (
              <>
                <h2 className="text-2xl font-bold mb-4 text-center">Seu feedback</h2>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Baseado em {allTranscriptions.length} respostas analisadas
                </p>

                {/* Positive Reinforcement */}
                <Card variant="success" padding="lg" className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Check className="w-6 h-6" />
                    <span className="font-semibold">Ótimo trabalho!</span>
                  </div>
                  <p className="opacity-90">{evaluation.positiveReinforcement}</p>
                </Card>

                {/* Scores Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-xl bg-card border">
                    <p className="text-2xl font-bold text-primary">{evaluation.scores.fluency}%</p>
                    <p className="text-xs text-muted-foreground">Fluência</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-card border">
                    <p className="text-2xl font-bold text-accent">{evaluation.scores.clarity}%</p>
                    <p className="text-xs text-muted-foreground">Clareza</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-card border">
                    <p className="text-2xl font-bold text-secondary-foreground">{Math.round(speakingDuration)}s</p>
                    <p className="text-xs text-muted-foreground">Tempo</p>
                  </div>
                </div>

                <Card variant="default" padding="default" className="mb-3">
                  <h4 className="font-semibold mb-2 text-primary">🎯 Fluência</h4>
                  <p className="text-sm text-muted-foreground">{evaluation.fluencyNote}</p>
                </Card>

                {evaluation.pronunciationTip && (
                  <Card variant="default" padding="default" className="mb-3">
                    <h4 className="font-semibold mb-2 text-accent">🗣️ Pronúncia</h4>
                    <p className="text-sm text-muted-foreground">{evaluation.pronunciationTip}</p>
                  </Card>
                )}

                {evaluation.naturalPhrase && (
                  <Card variant="elevated" padding="default" className="mb-auto">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Quote className="w-4 h-4" /> Sugestão
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground line-through">
                        "{evaluation.naturalPhrase.original}"
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        ✨ "{evaluation.naturalPhrase.improved}"
                      </p>
                    </div>
                  </Card>
                )}

                {!evaluation.naturalPhrase && (
                  <Card variant="elevated" padding="default" className="mb-auto">
                    <h4 className="font-semibold mb-2">💪 Continue assim!</h4>
                    <p className="text-sm text-muted-foreground">{evaluation.encouragement}</p>
                  </Card>
                )}

                {canFinish ? (
                  <Button variant="hero" size="xl" className="mt-6" onClick={handleNextStep}>
                    Finalizar desafio
                    <Check className="w-5 h-5" />
                  </Button>
                ) : (
                  <div className="mt-6 space-y-3">
                    <p className="text-sm text-muted-foreground text-center">
                      ⚠️ Desafio incompleto — grave mais respostas
                    </p>
                    <Button variant="outline" size="xl" className="w-full" onClick={() => {
                      // Go back to first incomplete output
                      const firstIncomplete = stepsCompleted.outputRecorded.findIndex(v => !v);
                      if (firstIncomplete >= 0) {
                        setOutputIndex(firstIncomplete);
                        setStep("output");
                      } else {
                        const firstShadowing = stepsCompleted.shadowingRecorded.findIndex(v => !v);
                        if (firstShadowing >= 0) {
                          setShadowingIndex(firstShadowing);
                          setStep("shadowing");
                        }
                      }
                    }}>
                      Retomar desafio
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Complete */}
        {step === "complete" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-scale-in">
            <ConfettiEffect />
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center mb-6 shadow-card">
              <Check className="w-12 h-12 text-accent-foreground" />
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {isFixation ? "Fixação Completa! 📖" : "Parabéns! 🎉"}
            </h2>
            <p className="text-muted-foreground mb-2">
              {isFixation ? "Excelente revisão!" : "Você completou o desafio de hoje."}
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Conclusão: {completionPct}%
            </p>

            <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{Math.max(1, Math.round(speakingDuration / 60))}min</p>
                <p className="text-xs text-muted-foreground">Falando</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{allTranscriptions.length}</p>
                <p className="text-xs text-muted-foreground">Respostas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-streak-fire">{evaluation?.scores.fluency || 70}%</p>
                <p className="text-xs text-muted-foreground">Fluência</p>
              </div>
            </div>

            <Button variant="hero" size="xl" className="w-full max-w-sm" onClick={() => {
              const minutes = Math.max(1, Math.round(speakingDuration / 60));
              onComplete(minutes, completionPct);
            }}>
              Voltar ao início
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
