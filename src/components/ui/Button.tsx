import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-ember text-white shadow-lg shadow-orange-500/20 hover:bg-orange-700",
        variant === "secondary" &&
          "border border-stone-300 bg-white text-ink hover:border-ember hover:text-ember",
        variant === "ghost" && "text-stone-700 hover:text-ember",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
