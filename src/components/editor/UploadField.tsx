import type { ChangeEventHandler } from "react";
import { Panel } from "@/components/ui/Panel";

interface UploadFieldProps {
  title: string;
  subtitle: string;
  accept: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export function UploadField({ title, subtitle, accept, onChange }: UploadFieldProps) {
  return (
    <Panel
      variant="soft"
      className="border-dashed border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(248,239,226,0.82))] p-0"
    >
      <label className="flex cursor-pointer flex-col gap-2 rounded-[28px] p-5">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-sm leading-6 text-stone-600">{subtitle}</span>
        <span className="mt-3 inline-flex w-fit rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20">
          Escolher arquivo
        </span>
        <input className="hidden" type="file" accept={accept} onChange={onChange} />
      </label>
    </Panel>
  );
}
