import type { ChangeEventHandler } from "react";
import { Panel } from "@/components/ui/Panel";

interface UploadFieldProps {
  title: string;
  subtitle: string;
  accept: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  compact?: boolean;
}

export function UploadField({
  title,
  subtitle,
  accept,
  onChange,
  compact = false,
}: UploadFieldProps) {
  return (
    <Panel
      variant="soft"
      className="border-dashed border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(248,239,226,0.82))] p-0"
    >
      <label
        className={`flex cursor-pointer flex-col rounded-[28px] ${
          compact ? "gap-1 p-3.5 sm:p-4" : "gap-2 p-5"
        }`}
      >
        <span className={`${compact ? "text-xs font-bold uppercase tracking-[0.18em]" : "text-sm font-semibold"} text-ink`}>
          {title}
        </span>
        <span className={`${compact ? "text-xs leading-4.5" : "text-sm leading-6"} text-stone-600`}>
          {subtitle}
        </span>
        <span
          className={`inline-flex w-fit rounded-full bg-ember font-semibold text-white shadow-lg shadow-orange-500/20 ${
            compact ? "mt-1.5 px-3 py-1.5 text-[11px]" : "mt-3 px-4 py-2 text-sm"
          }`}
        >
          Escolher arquivo
        </span>
        <input className="hidden" type="file" accept={accept} onChange={onChange} />
      </label>
    </Panel>
  );
}
