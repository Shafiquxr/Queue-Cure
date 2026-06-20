import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'yellow' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export function BrutalistButton({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: ButtonProps) {
  const variants = {
    primary: "bg-qc-black text-qc-yellow border-qc-black",
    yellow: "bg-qc-yellow text-qc-black border-qc-black",
    outline: "bg-qc-cream text-qc-black border-qc-black",
    destructive: "bg-qc-red text-qc-white border-qc-red",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-4 py-2.5 text-[11px]",
    lg: "px-5 py-3.5 text-[14px]",
  };

  return (
    <button
      className={cn(
        "font-mono font-bold uppercase tracking-widest border-3 transition-all",
        "shadow-brutal hover:shadow-brutal-hover active:shadow-brutal-active active:translate-y-[2px]",
        "disabled:bg-qc-gray disabled:text-qc-white disabled:cursor-not-allowed disabled:shadow-none disabled:border-qc-gray disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
