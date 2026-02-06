import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FreeTalkCardProps {
  remainingMinutes?: number;
  isPremium?: boolean;
  onStart: () => void;
  className?: string;
}

export function FreeTalkCard({
  remainingMinutes = 10,
  isPremium = false,
  onStart,
  className
}: FreeTalkCardProps) {
  return (
    <Card 
      variant="interactive" 
      padding="default" 
      className={cn("group", className)}
      onClick={onStart}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
          <MessageCircle className="w-7 h-7 text-secondary-foreground" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CardTitle className="text-base">Free Talk</CardTitle>
            {isPremium && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-medal-gold/20 text-xs font-medium text-medal-gold">
                <Sparkles className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>
          <CardDescription className="line-clamp-1">
            Conversa livre com IA sobre qualquer tema
          </CardDescription>
          
          {/* Time remaining (for free users) */}
          {!isPremium && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{remainingMinutes} min restantes esta semana</span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      </div>
    </Card>
  );
}
