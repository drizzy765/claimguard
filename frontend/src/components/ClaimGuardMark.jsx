import { cn } from "@/lib/utils";

export default function ClaimGuardMark({
  scanning = false,
  tone = "default",
  className,
  size = 40,
}) {
  const fill =
    tone === "clean"
      ? "var(--color-clean)"
      : tone === "review"
        ? "var(--color-review)"
        : tone === "fraud"
          ? "var(--color-fraud)"
          : "var(--color-leaf-deep)";

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-lg", scanning && "cg-scan-active", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="block">
        <path
          fill={fill}
          d="M32 4c10 6 20 8 24 9v18c0 14-10 24-24 29C18 55 8 45 8 31V13c4-1 14-3 24-9z"
        />
        <rect x="20" y="18" width="24" height="28" rx="2.5" fill="#E8F0EA" />
        <path fill={fill} opacity="0.25" d="M26 24h12v2H26zm0 6h12v2H26zm0 6h8v2h-8z" />
        <path
          fill="none"
          stroke={tone === "default" ? "#1F6B4A" : fill}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M26 34l5 5 9-11"
        />
      </svg>
      {scanning && (
        <div
          className="cg-scan-line pointer-events-none absolute inset-x-1 h-1 rounded-full bg-leaf/80"
          style={{ top: 0 }}
        />
      )}
    </div>
  );
}
