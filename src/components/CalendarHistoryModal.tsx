import { useState, useMemo } from "react";
import { format, startOfWeek, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useCalendarHistory, DayData } from "@/hooks/useCalendarHistory";
import { Mic, CheckCircle2, X, Trophy, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const medalEmoji: Record<string, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

export function CalendarHistoryModal({ open, onOpenChange }: CalendarHistoryModalProps) {
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const { dayDataMap, weekMedals, totals, loading } = useCalendarHistory(visibleMonth);

  const completedDays = useMemo(() => {
    const dates: Date[] = [];
    dayDataMap.forEach((d, key) => {
      if (d.challenge_completed) dates.push(new Date(key + "T00:00:00"));
    });
    return dates;
  }, [dayDataMap]);

  const partialDays = useMemo(() => {
    const dates: Date[] = [];
    dayDataMap.forEach((d, key) => {
      if (!d.challenge_completed && d.speaking_minutes > 0) dates.push(new Date(key + "T00:00:00"));
    });
    return dates;
  }, [dayDataMap]);

  const selectedDayData: DayData | null = selectedDate
    ? dayDataMap.get(format(selectedDate, "yyyy-MM-dd")) || null
    : null;

  const getMedalForWeek = (date: Date): string | null => {
    const wm = weekMedals.find((m) => isSameWeek(date, m.weekStart, { weekStartsOn: 0 }));
    return wm?.medal ? medalEmoji[wm.medal] : null;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle className="text-lg font-bold">Sua Jornada</DrawerTitle>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-full hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          {/* Journey totals */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-accent/10 rounded-xl p-3">
              <Mic className="w-5 h-5 text-accent shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{totals.totalMinutes}</p>
                <p className="text-xs text-muted-foreground">min falados</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-primary/10 rounded-xl p-3">
              <BookOpen className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{totals.totalWords}</p>
                <p className="text-xs text-muted-foreground">palavras</p>
              </div>
            </div>
          </div>

          {/* Calendar with medals */}
          <div className="relative">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              locale={ptBR}
              showOutsideDays={false}
              className="p-0 pointer-events-auto"
              modifiers={{
                completed: completedDays,
                partial: partialDays,
              }}
              modifiersClassNames={{
                completed: "!bg-accent/80 !text-accent-foreground font-semibold",
                partial: "!bg-yellow-400/30 !text-foreground",
              }}
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-semibold",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-border",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem] text-center",
                row: "flex w-full mt-1 items-center",
                cell: "h-9 w-9 text-center text-sm p-0 relative",
                day: "h-9 w-9 p-0 font-normal rounded-full inline-flex items-center justify-center hover:bg-muted transition-colors aria-selected:ring-2 aria-selected:ring-primary",
                day_selected: "!ring-2 !ring-primary",
                day_today: "font-bold",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_hidden: "invisible",
              }}
            />

            {/* Weekly medals overlay */}
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              {weekMedals.map((wm, i) => 
                wm.medal ? (
                  <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full">
                    S{i + 1} {medalEmoji[wm.medal]}
                  </span>
                ) : null
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-accent/80" />
              <span>Completo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
              <span>Parcial</span>
            </div>
          </div>

          {/* Day detail */}
          {selectedDate && (
            <div className="mt-4 p-4 bg-muted/50 rounded-2xl border border-border animate-scale-in">
              <p className="text-sm font-semibold text-foreground mb-2">
                📅 {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </p>
              {selectedDayData ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    {selectedDayData.challenge_completed ? (
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                    )}
                    <span className={selectedDayData.challenge_completed ? "text-accent font-medium" : "text-muted-foreground"}>
                      {selectedDayData.challenge_completed ? "Desafio concluído" : "Desafio não concluído"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedDayData.speaking_minutes} min falados</span>
                  </div>
                  {(selectedDayData.fluency_score || selectedDayData.pronunciation_score) && (
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      {selectedDayData.fluency_score && <span>Fluência: {selectedDayData.fluency_score}</span>}
                      {selectedDayData.pronunciation_score && <span>Pronúncia: {selectedDayData.pronunciation_score}</span>}
                      {selectedDayData.clarity_score && <span>Clareza: {selectedDayData.clarity_score}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem atividade neste dia</p>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
