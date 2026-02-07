import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface WaveformVisualizerProps {
  isActive?: boolean;
  barCount?: number;
  className?: string;
}

export function WaveformVisualizer({ 
  isActive = false, 
  barCount = 24,
  className 
}: WaveformVisualizerProps) {
  const [heights, setHeights] = useState<number[]>(Array(barCount).fill(20));

  useEffect(() => {
    if (!isActive) {
      setHeights(Array(barCount).fill(20));
      return;
    }

    // Animate heights randomly when active
    const interval = setInterval(() => {
      setHeights(prevHeights => 
        prevHeights.map(() => Math.random() * 60 + 20)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, barCount]);

  return (
    <div className={cn("flex items-center justify-center gap-0.5 h-16", className)}>
      {heights.map((height, i) => {
        const delay = i * 0.03;
        
        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all",
              isActive 
                ? "bg-gradient-to-t from-primary to-primary-glow duration-100" 
                : "bg-muted duration-300"
            )}
            style={{
              height: isActive ? `${height}%` : '20%',
              transitionDelay: isActive ? `${delay}s` : '0s',
            }}
          />
        );
      })}
    </div>
  );
}
