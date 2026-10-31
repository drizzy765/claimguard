import { cn } from "@/lib/utils";

const tones = {
  default: "bg-paper text-ink-muted border-line",
  clean: "bg-clean-bg text-clean border-clean/20",
  review: "bg-review-bg text-review border-review/20",
  fraud: "bg-fraud-bg text-fraud border-fraud/20",
  leaf: "bg-leaf/10 text-leaf border-leaf/20",
};

export default function Badge({ tone = "default", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
