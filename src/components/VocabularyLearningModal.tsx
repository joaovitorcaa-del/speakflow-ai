import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VocabularyWord } from "@/hooks/useVocabulary";
import { Volume2, Check, Loader2, BookOpen, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VocabularyLearningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingWords: VocabularyWord[];
  totalLearned: number;
  onMarkConfident: (wordId: string) => Promise<void>;
  onGenerateMore: (theme?: string) => Promise<{ error?: string; words?: VocabularyWord[]; remaining?: number }>;
  isGenerating: boolean;
}

export function VocabularyLearningModal({
  open,
  onOpenChange,
  pendingWords,
  totalLearned,
  onMarkConfident,
  onGenerateMore,
  isGenerating,
}: VocabularyLearningModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [localPendingWords, setLocalPendingWords] = useState<VocabularyWord[]>(pendingWords);

  useEffect(() => {
    setLocalPendingWords(pendingWords);
    setCurrentIndex(0);
  }, [pendingWords]);

  const currentWord = localPendingWords[currentIndex];
  const hasMoreWords = currentIndex < localPendingWords.length - 1;
  const isComplete = localPendingWords.length === 0;

  const playPronunciation = async () => {
    if (!currentWord || isPlayingAudio) return;

    setIsPlayingAudio(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: currentWord.word, voice: "alloy" }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing pronunciation:", error);
      toast.error("Erro ao reproduzir pronúncia");
      setIsPlayingAudio(false);
    }
  };

  const handleConfident = async () => {
    if (!currentWord || isMarking) return;

    setIsMarking(true);
    try {
      await onMarkConfident(currentWord.id);
      
      // Remove from local list and advance
      const newList = localPendingWords.filter(w => w.id !== currentWord.id);
      setLocalPendingWords(newList);
      
      if (newList.length > 0) {
        // Stay at same index (next word slides in)
        setCurrentIndex(Math.min(currentIndex, newList.length - 1));
      }
    } catch (error) {
      console.error("Error marking as confident:", error);
      toast.error("Erro ao salvar progresso");
    } finally {
      setIsMarking(false);
    }
  };

  const handleGenerateMore = async () => {
    const result = await onGenerateMore();
    if (result.error) {
      toast.info(result.error);
    } else if (result.words) {
      setLocalPendingWords(prev => [...prev, ...result.words!]);
      toast.success(`+${result.words.length} novas palavras!`);
    }
  };

  if (isComplete && !isGenerating) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm rounded-2xl">
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2">Muito bem! 🎉</h3>
            <p className="text-muted-foreground mb-4">
              Você aprendeu todas as palavras de hoje.
            </p>
            <p className="text-2xl font-bold text-primary mb-6">
              {totalLearned} palavras
            </p>
            <p className="text-xs text-muted-foreground italic mb-6">
              Fluência não é um ponto final. É algo que se mantém.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={handleGenerateMore} 
                disabled={isGenerating}
                variant="outline"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Aprender mais palavras
                  </>
                )}
              </Button>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isGenerating && localPendingWords.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm rounded-2xl">
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Gerando palavras para você...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!currentWord) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Nova Palavra
            </DialogTitle>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} de {localPendingWords.length}
            </span>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Word */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-3xl font-bold text-foreground">
                {currentWord.word}
              </h2>
              <button
                onClick={playPronunciation}
                disabled={isPlayingAudio}
                className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                aria-label="Ouvir pronúncia"
              >
                {isPlayingAudio ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Volume2 className="w-5 h-5 text-primary" />
                )}
              </button>
            </div>
            {currentWord.context_theme && (
              <span className="text-xs text-muted-foreground mt-1 inline-block">
                Tema: {currentWord.context_theme}
              </span>
            )}
          </div>

          {/* Explanation */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm text-foreground leading-relaxed">
              {currentWord.explanation}
            </p>
          </div>

          {/* Example phrase */}
          <div className="border-l-4 border-primary/30 pl-4">
            <p className="text-sm italic text-muted-foreground">
              "{currentWord.example_phrase}"
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5">
            {localPendingWords.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex
                    ? "bg-primary"
                    : idx < currentIndex
                    ? "bg-accent"
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action button */}
        <Button
          onClick={handleConfident}
          disabled={isMarking}
          size="lg"
          className="w-full"
        >
          {isMarking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              I feel confident
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
