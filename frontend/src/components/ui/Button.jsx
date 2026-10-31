import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-leaf text-white hover:bg-leaf-deep shadow-sm active:scale-[0.96] cg-shimmer-btn",
  secondary:
    "bg-surface text-ink border border-line hover:bg-paper active:scale-[0.96]",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-paper",
  danger: "bg-fraud text-white hover:opacity-90 active:scale-[0.96]",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[transform,background-color,opacity] duration-150 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
