import { ReactNode, useState } from "react";
import { Card } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: ReactNode;
  value: string;
  label: string;
  sublabel?: string;
  iconBgClass?: string;
  modalTitle?: string;
  modalDescription?: string;
  modalContent?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function MetricCard({
  icon,
  value,
  label,
  sublabel,
  iconBgClass = "bg-muted",
  modalTitle,
  modalDescription,
  modalContent,
  actionLabel,
  onAction,
  className
}: MetricCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasModal = modalTitle || modalContent;

  return (
    <>
      <Card 
        variant={hasModal ? "interactive" : "default"} 
        padding="default"
        className={cn("relative", className)}
        onClick={hasModal ? () => setIsOpen(true) : undefined}
      >
        {hasModal && (
          <div className="absolute top-3 right-3">
            <Info className="w-4 h-4 text-muted-foreground/50" />
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", iconBgClass)}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sublabel && (
              <p className="text-xs text-muted-foreground/70">{sublabel}</p>
            )}
          </div>
        </div>
      </Card>

      {hasModal && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
              {modalDescription && (
                <DialogDescription>{modalDescription}</DialogDescription>
              )}
            </DialogHeader>
            
            <div className="py-4">
              {modalContent}
            </div>

            {actionLabel && onAction && (
              <Button onClick={onAction} className="w-full">
                {actionLabel}
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
