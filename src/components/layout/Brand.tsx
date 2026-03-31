import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

interface BrandProps {
  compact?: boolean;
  className?: string;
}

export function Brand({ compact = false, className }: BrandProps) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-3 text-ink transition hover:opacity-95",
        compact ? "gap-2.5" : "gap-3.5",
        className,
      )}
      aria-label="Ir para a pagina inicial do Moldify"
    >
      <img
        src="/brand/moldify-logo.png"
        alt="Logo do Moldify"
        className={cn(
          "shrink-0 rounded-[18px] object-cover shadow-[0_16px_30px_-22px_rgba(18,52,37,0.55)]",
          compact ? "h-10 w-10 rounded-[14px]" : "h-12 w-12",
        )}
      />
      <div className="flex flex-col">
        <span className={cn("font-display font-bold tracking-tight", compact ? "text-lg" : "text-xl sm:text-2xl")}>
          Moldify
        </span>
        {!compact ? (
          <span className="text-xs uppercase tracking-[0.18em] text-stone-500">Studio visual</span>
        ) : null}
      </div>
    </Link>
  );
}
