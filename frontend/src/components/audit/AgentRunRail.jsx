import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentRunRail({ steps, activeStep, logs, running }) {
  return (
    <section className="grid gap-4" aria-label="Agent pipeline" aria-live="polite">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => {
          const done = activeStep > i || (!running && activeStep >= steps.length);
          const active = running && activeStep === i;
          return (
            <div
              key={s.id}
              className={cn(
                "rounded-[10px] border border-line bg-surface p-3 transition-[border-color,box-shadow] duration-200",
                active && "cg-border-beam border-leaf/40 shadow-sm",
                done && !active && "border-clean/30 bg-clean-bg/40"
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <strong className="text-sm text-ink">{s.label}</strong>
                {active ? (
                  <Loader2 size={14} className="animate-spin text-leaf" aria-label="Running" />
                ) : done ? (
                  <Check size={14} className="text-clean" aria-label="Done" />
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-ink-muted">Idle</span>
                )}
              </div>
              <p className="text-xs text-ink-muted">{s.detail}</p>
            </div>
          );
        })}
      </div>

      {logs.length > 0 && (
        <div className="max-h-40 overflow-auto rounded-[10px] border border-line bg-ink px-3 py-2 font-mono text-xs text-[#E8F0EA]">
          {logs.slice(-12).map((l, i) => (
            <div key={`${l.t}-${i}`} className="cg-blur-in py-0.5 opacity-90">
              <span className="text-leaf/80">›</span> {l.text}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
