import React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      md: "h-6 w-6 border-2",
      lg: "h-8 w-8 border-3",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-solid border-t-transparent border-primary",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Spinner.displayName = "Spinner";
