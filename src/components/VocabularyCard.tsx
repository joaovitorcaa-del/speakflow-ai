import { useState } from "react";
import { Card } from "@/components/ui/card";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";
import { VocabularyLearningModal } from "./VocabularyLearningModal";
import { useVocabulary } from "@/hooks/useVocabulary";

interface VocabularyCardProps {
  className?: string;
}

export function VocabularyCard({ className }: VocabularyCardProps) {
  const [showModal, setShowModal] = useState(false);
  const { stats, loading, generating, generateWords, markAsConfident } = useVocabulary();

  const hasPendingWords = stats && stats.pendingWords.length > 0;
  
  const handleCardClick = async () => {
    // If no pending words, generate new ones first
    if (!hasPendingWords && !generating) {
      await generateWords();
    }
    setShowModal(true);
  };

  const handleGenerateMore = async (theme?: string) => {
    const result = await generateWords(theme, 3);
    return result;
  };

  const handleMarkConfident = async (wordId: string) => {
    await markAsConfident(wordId);
  };

  if (loading) {
    return (
      <Card className={`p-4 animate-pulse bg-muted ${className}`}>
        <div className="h-16" />
      </Card>
    );
  }

  return (
    <>
      <button
        onClick={handleCardClick}
        disabled={generating}
        className={`w-full text-left p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all group ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">Novas Palavras</p>
                {hasPendingWords && (
                  <span className="flex items-center gap-1 text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    {stats.pendingWords.length} para aprender
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalWords || 0} palavras ao longo da sua jornada
                {stats && stats.thisWeekWords > 0 && (
                  <span className="text-accent"> • +{stats.thisWeekWords} esta semana</span>
                )}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </button>

      <VocabularyLearningModal
        open={showModal}
        onOpenChange={setShowModal}
        pendingWords={stats?.pendingWords || []}
        totalLearned={stats?.totalWords || 0}
        onMarkConfident={handleMarkConfident}
        onGenerateMore={handleGenerateMore}
        isGenerating={generating}
      />
    </>
  );
}
