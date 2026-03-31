import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

interface StatusPanelProps {
  title: string;
  description: string;
  tone?: "neutral" | "warning" | "danger";
  compact?: boolean;
  loading?: boolean;
  actions?: ReactNode;
}

export function StatusPanel({
  title,
  description,
  tone = "neutral",
  compact = false,
  loading = false,
  actions,
}: StatusPanelProps) {
  return (
    <Panel
      className={cn(
        "space-y-3",
        tone === "warning" && "border-orange-200 bg-orange-50/90",
        tone === "danger" && "border-red-200 bg-red-50/90",
        compact && "p-5",
      )}
    >
      <div className="flex items-start gap-3">
        {loading ? (
          <span
            aria-hidden="true"
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-ember shadow-[0_0_0_6px_rgba(196,90,26,0.14)]"
          />
        ) : null}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="text-sm leading-6 text-stone-600">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </Panel>
  );
}
