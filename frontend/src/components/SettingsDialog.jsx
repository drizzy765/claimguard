import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";

export default function SettingsDialog({
  open,
  onClose,
  apiBase,
  setApiBase,
  apiKey,
  setApiKey,
}) {
  const titleId = useId();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector("input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 no-print"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[10px] border border-line bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold">
              Connection settings
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              API host and the same master key the server uses as FACTORY_MASTER_KEY.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-ink-muted hover:bg-paper hover:text-ink"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          API host
          <input
            className="h-11 rounded-md border border-line bg-paper px-3 text-sm font-normal normal-case tracking-normal text-ink"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="/cg-api or https://claimguard-sfxx.onrender.com"
          />
        </label>

        <label className="mb-5 flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          X-Factory-API-Key
          <input
            type="password"
            className="h-11 rounded-md border border-line bg-paper px-3 text-sm font-normal normal-case tracking-normal text-ink"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="FACTORY_MASTER_KEY"
            autoComplete="off"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
