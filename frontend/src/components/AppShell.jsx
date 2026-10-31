import { NavLink, Link } from "react-router-dom";
import { Github, Settings } from "lucide-react";
import ClaimGuardMark from "@/components/ClaimGuardMark";
import { cn } from "@/lib/utils";

const links = [
  { to: "/audit", label: "Audit" },
  { to: "/history", label: "History" },
  { to: "/about", label: "About" },
];

export default function AppShell({
  children,
  health,
  onOpenSettings,
  scanning = false,
  markTone = "default",
  bare = false,
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <ClaimGuardMark scanning={scanning} tone={markTone} size={36} />
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold leading-tight tracking-tight">
                ClaimGuard
              </div>
              <div className="truncate text-xs text-ink-muted">
                HMO bill auditor · Gemma 4
              </div>
            </div>
          </Link>

          {!bare && (
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink",
                      isActive && "bg-surface text-ink shadow-sm border border-line"
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
              )}
              title="API health"
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  health === "online" && "bg-clean",
                  health === "offline" && "bg-fraud",
                  (health === "checking" || health === "degraded") && "bg-review"
                )}
              />
              {health}
            </span>
            <a
              href="https://github.com/drizzy765/claimguard"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-md p-2 text-ink-muted hover:bg-surface hover:text-ink sm:inline-flex"
              aria-label="View on GitHub"
            >
              <Github size={18} />
            </a>
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex rounded-md p-2 text-ink-muted hover:bg-surface hover:text-ink"
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
        {!bare && (
          <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 sm:hidden" aria-label="Mobile">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-ink-muted",
                    isActive && "bg-surface text-ink border border-line"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
