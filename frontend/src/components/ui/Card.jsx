import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-[10px] border border-line bg-surface shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-2", className)}>{children}</div>;
}

export function CardTitle({ className, children }) {
  return <h3 className={cn("font-display text-lg font-semibold text-ink", className)}>{children}</h3>;
}

export function CardDescription({ className, children }) {
  return <p className={cn("text-sm text-ink-muted", className)}>{children}</p>;
}

export function CardContent({ className, children }) {
  return <div className={cn("p-4 pt-2", className)}>{children}</div>;
}
