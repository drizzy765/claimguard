import { cn } from "@/lib/utils";

export default function Alert({ tone = "default", className, children, icon }) {
  const styles = {
    default: "border-line bg-paper text-ink",
    warn: "border-review/30 bg-review-bg text-review",
    error: "border-fraud/30 bg-fraud-bg text-fraud",
    info: "border-leaf/30 bg-leaf/5 text-ink",
  };
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-[10px] border px-4 py-3 text-sm",
        styles[tone],
        className
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
