import type { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  className?: string;
  variant?: "default" | "hero" | "soft" | "compact" | "dark";
  size?: "sm" | "md" | "lg";
}

export function Panel({
  children,
  className,
  variant = "default",
  size = "md",
}: PropsWithChildren<PanelProps>) {
  const variantClasses = {
    default:
      "border-white/70 bg-white/82 shadow-[0_26px_70px_-42px_rgba(21,17,15,0.24)] backdrop-blur-xl",
    hero: "border-white/80 bg-white/74 shadow-[0_34px_90px_-46px_rgba(22,19,18,0.26)] backdrop-blur-xl",
    soft: "border-stone-200/70 bg-[#fffdf8]/88 shadow-[0_24px_60px_-40px_rgba(29,58,47,0.18)] backdrop-blur-xl",
    compact:
      "border-stone-200/75 bg-white/92 shadow-[0_18px_42px_-32px_rgba(22,19,18,0.18)] backdrop-blur-lg",
    dark: "border-white/10 bg-pine text-white shadow-[0_26px_70px_-38px_rgba(10,20,16,0.55)]",
  };

  const sizeClasses = {
    sm: "rounded-[24px] p-4 sm:p-5",
    md: "rounded-[30px] p-6",
    lg: "rounded-[34px] p-6 sm:p-7",
  };

  return (
    <div
      className={cn(
        "border",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
