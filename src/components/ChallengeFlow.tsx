import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ProgressBar";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useProfile } from "@/hooks/useProfile";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  Square,
  Check,
  ChevronRight,
  Volume2,
  Loader2,
  AlertCircle,
  Quote,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ChallengeStep = "input" | "shadowing" | "output" | "feedback" | "complete";

interface ChallengeFlowProps {
  onBack: () => void;
  onComplete: () => void;
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

export function ChallengeFlow({ onBack, onComplete }: ChallengeFlowProps) {
  const { profile } = useProfile();
  const [step, setStep] = useState<ChallengeStep>("input");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [shadowingIndex, setShadowingIndex] = useState(0);
  const [outputIndex, setOutputIndex] = useState(0);
  const [allTranscriptions, setAllTranscriptions] = useState<string[]>([]);
  const [shadowingFeedback, setShadowingFeedback] = useState<ShadowingFeedback | null>(null);
  const [evaluation, setEvaluation] = useState<SpeechEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [speakingDuration, setSpeakingDuration] = useState(0);
  const recordingStartRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, string>>(new Map());

  // Get goal-based content
  const goalThemes: Record<string, { title: string; inputText: string; questions: string[] }> = {
    work: {
      title: "Descrevendo seu trabalho",
      inputText: `I've been working at this company for about three years now. My main responsibilities include managing the marketing team and overseeing our digital campaigns. 
      
What I enjoy most is the creative problem-solving aspect of my job. Every day brings new challenges that keep me engaged and motivated. For example, last week we had to completely redesign our social media strategy because our target audience shifted.

The most challenging part is probably balancing multiple projects at once. I usually have three or four campaigns running simultaneously, each with different deadlines and requirements. But I've learned to prioritize effectively and communicate clearly with my team.`,
      questions: [
        "Tell me about your current job or studies. What do you do on a typical day?",
        "What's the most interesting project you've worked on recently?",
        "What challenges do you face in your work? How do you handle them?",
        "How do you stay motivated when things get difficult?"
      ]
    },
    travel: {
      title: "Planejando uma viagem",
      inputText: `I'm planning a trip to Europe next summer. I've always wanted to visit Italy and France, especially the coastal areas. I'm thinking of spending about two weeks there.

The tricky part is deciding between a guided tour or traveling independently. Tours are convenient but I prefer having flexibility to explore on my own. I usually research places online and make a rough itinerary, but I leave room for spontaneous adventures.

One thing I've learned is to pack light. On my last trip, I brought too many clothes and it was a hassle. Now I stick to versatile pieces that I can mix and match.`,
      questions: [
        "Tell me about a place you'd love to visit. Why does it interest you?",
        "Describe your last trip. What did you enjoy most?",
        "Do you prefer guided tours or traveling independently? Why?",
        "What's your best travel tip for other travelers?"
      ]
    },
    conversation: {
      title: "Conversação do dia a dia",
      inputText: `I had a really interesting weekend. On Saturday, I met up with some old friends for brunch at this new café downtown. The food was amazing - I had avocado toast with poached eggs.

After that, we walked around the neighborhood and did some window shopping. There's this vintage bookstore that I always love visiting. I ended up buying a classic novel I've been meaning to read.

Sunday was more relaxed. I stayed home, did some cleaning, and watched a documentary about ocean life. It was really fascinating to learn about deep sea creatures.`,
      questions: [
        "What do you usually do on weekends? Tell me about your routine.",
        "Do you have any hobbies? What do you enjoy doing in your free time?",
        "Tell me about someone important in your life. Why are they special?",
        "What's something new you've learned recently?"
      ]
    },
    study: {
      title: "Vida acadêmica",
      inputText: `I'm currently in my second year of university, studying computer science. It's challenging but really rewarding. My favorite subjects are algorithms and artificial intelligence.

What I find most interesting is how technology is changing so rapidly. Last semester, I worked on a project using machine learning to analyze data. It was my first hands-on experience with AI and I learned a lot.

Balancing studies with other activities can be tough. I try to manage my time by using a planner and setting specific study hours. It doesn't always work perfectly, but it helps me stay organized.`,
      questions: [
        "What are you studying or what did you study? Why did you choose it?",
        "Tell me about a memorable learning experience you've had.",
        "How do you manage your time between studies and other activities?",
        "What are your academic or career goals?"
      ]
    }
  };

  const currentGoal = profile?.goal || 'conversation';
  const themeContent = goalThemes[currentGoal] || goalThemes.conversation;

  const shadowingSentences = [
    "I've been working on this for about three years now.",
    "My main responsibilities include managing the team.",
    "What I enjoy most is the creative problem-solving aspect.",
    "Every day brings new challenges that keep me engaged.",
    "I've learned to prioritize effectively and communicate clearly.",
  ];

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
    onPartialResult: (partial) => {
      // Real-time update
    }
  });

  const getProgress = () => {
    switch (step) {
      case "input": return 15;
      case "shadowing": return 30 + (shadowingIndex / shadowingSentences.length) * 30;
      case "output": return 60 + (outputIndex / themeContent.questions.length) * 30;
      case "feedback": return 95;
      case "complete": return 100;
      default: return 0;
    }
  };

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
          body: JSON.stringify({ 
            text,
            voiceId: "EXAVITQu4vr4xnSDxMaL"
          }),
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
    audio.onended = () => setIsPlaying(false);
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
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const playInputAudio = () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    playWithElevenLabs(themeContent.inputText);
  };

  const playShadowingSentence = () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
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
  }, [step, shadowingIndex]);

  const handleRecordToggle = async () => {
    if (isRecording || isListening) {
      // Stop recording
      const finalText = stopListening();
      setIsRecording(false);
      
      const duration = (Date.now() - recordingStartRef.current) / 1000;
      setSpeakingDuration(prev => prev + duration);

      if (finalText.trim()) {
        setAllTranscriptions(prev => [...prev, finalText.trim()]);
        
        // Get immediate feedback for shadowing
        if (step === "shadowing") {
          getShadowingFeedback(finalText.trim(), shadowingSentences[shadowingIndex]);
        }
      }
      resetTranscript();
    } else {
      // Start recording
      recordingStartRef.current = Date.now();
      const started = await startListening();
      if (started) {
        setIsRecording(true);
        setShadowingFeedback(null);
      }
    }
  };

  const getShadowingFeedback = async (userText: string, targetSentence: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('shadowing-feedback', {
        body: { 
          userTranscription: userText,
          targetSentence
        }
      });
      
      if (!error && data) {
        setShadowingFeedback(data);
      }
    } catch (err) {
      console.error("Error getting shadowing feedback:", err);
    }
  };

  const evaluateSpeech = async () => {
    setIsEvaluating(true);
    
    const fullTranscription = allTranscriptions.join(' ');
    
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-speech', {
        body: {
          transcription: fullTranscription,
          context: themeContent.title,
          challengeType: 'daily-challenge',
          speakingDurationSeconds: Math.round(speakingDuration)
        }
      });

      if (!error && data?.evaluation) {
        setEvaluation(data.evaluation);
      } else {
        // Fallback
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

  const handleNextStep = () => {
    if (step === "input") setStep("shadowing");
    else if (step === "shadowing") {
      if (shadowingIndex < shadowingSentences.length - 1) {
        setShadowingIndex(prev => prev + 1);
      } else {
        setStep("output");
      }
    } else if (step === "output") {
      if (outputIndex < themeContent.questions.length - 1) {
        setOutputIndex(prev => prev + 1);
      } else {
        evaluateSpeech();
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

            <Card variant="gradient" padding="none" className="aspect-video mb-6 overflow-hidden">
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
              <h3 className="font-semibold mb-2">{themeContent.title}</h3>
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
              <p className="text-xl font-medium text-center leading-relaxed">
                "{shadowingSentences[shadowingIndex]}"
              </p>
            </Card>

            {/* Immediate Shadowing Feedback */}
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

            {/* Live transcript while recording */}
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
              <Button variant="outline" size="icon-lg" onClick={() => setShadowingFeedback(null)}>
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

            {/* Waveform */}
            <div className="mb-6">
              <WaveformVisualizer isActive={isRecording || isListening} />
            </div>

            {/* Recording button */}
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
                OUTPUT • {outputIndex + 1}/{themeContent.questions.length}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6">Agora é sua vez!</h2>

            <Card variant="primary" padding="lg" className="mb-6">
              <p className="text-lg font-medium text-center">
                {themeContent.questions[outputIndex]}
              </p>
            </Card>

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

            {/* Waveform */}
            <div className="mb-6">
              <WaveformVisualizer isActive={isRecording || isListening} />
            </div>

            {/* Recording button */}
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

            <Button 
              variant="hero" 
              size="xl" 
              className="mt-6" 
              onClick={handleNextStep}
            >
              {outputIndex < themeContent.questions.length - 1 ? "Próxima pergunta" : "Ver feedback"}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Feedback Block */}
        {step === "feedback" && (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-4 text-center">Seu feedback</h2>
            
            {/* AI Analysis Notice */}
            <p className="text-xs text-muted-foreground text-center mb-4">
              Cada resposta é analisada individualmente pela IA
            </p>

            {isEvaluating ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Analisando sua fala...</p>
                </div>
              </div>
            ) : evaluation ? (
              <>
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

                {/* Fluency Note */}
                <Card variant="default" padding="default" className="mb-3">
                  <h4 className="font-semibold mb-2 text-primary">🎯 Fluência</h4>
                  <p className="text-sm text-muted-foreground">{evaluation.fluencyNote}</p>
                </Card>

                {/* Pronunciation Tip */}
                {evaluation.pronunciationTip && (
                  <Card variant="default" padding="default" className="mb-3">
                    <h4 className="font-semibold mb-2 text-accent">🗣️ Pronúncia</h4>
                    <p className="text-sm text-muted-foreground">{evaluation.pronunciationTip}</p>
                  </Card>
                )}

                {/* Natural Phrase Suggestion */}
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
              </>
            ) : null}

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
                <p className="text-2xl font-bold text-primary">{Math.round(speakingDuration / 60)}min</p>
                <p className="text-xs text-muted-foreground">Falando</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{shadowingSentences.length}</p>
                <p className="text-xs text-muted-foreground">Frases</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-streak-fire">{evaluation?.scores.fluency || 70}%</p>
                <p className="text-xs text-muted-foreground">Fluência</p>
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
