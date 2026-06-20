import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const BrutalistInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-qc-cream border-3 border-qc-black px-3 py-2.5 font-mono text-[11px] outline-none",
          "focus:border-qc-blue focus:ring-2 focus:ring-qc-blue placeholder:text-qc-gray",
          className
        )}
        {...props}
      />
    );
  }
);

BrutalistInput.displayName = "BrutalistInput";
