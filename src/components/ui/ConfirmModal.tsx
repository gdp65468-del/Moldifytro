import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "default",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-white/80 bg-[linear-gradient(160deg,rgba(255,249,241,0.98),rgba(255,255,255,0.96))] p-6 shadow-[0_36px_110px_-48px_rgba(17,24,39,0.55)]">
        <div className="flex items-start gap-4">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-[0.18em]",
              tone === "danger" ? "bg-red-100 text-red-700" : "bg-[#f7ebdd] text-ember",
            ].join(" ")}
          >
            {tone === "danger" ? "!" : "OK"}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            className={tone === "danger" ? "bg-red-600 shadow-red-500/20 hover:bg-red-700" : undefined}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Aguarde..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
