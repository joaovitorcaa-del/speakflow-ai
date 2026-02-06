import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-soft hover:shadow-glow",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        outline: "border-2 border-primary/20 bg-background hover:bg-primary/5 hover:border-primary/40 text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom variants for SpeakDaily
        hero: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] font-bold",
        success: "bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98] shadow-soft",
        record: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-lg animate-pulse-glow",
        soft: "bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98]",
        "soft-muted": "bg-muted text-muted-foreground hover:bg-muted/80 active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-14 rounded-xl px-8 text-base",
        xl: "h-16 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11 rounded-xl",
        "icon-sm": "h-9 w-9 rounded-lg",
        "icon-lg": "h-14 w-14 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
