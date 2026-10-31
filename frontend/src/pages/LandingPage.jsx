import { Link } from "react-router-dom";
import { Github } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ClaimGuardMark from "@/components/ClaimGuardMark";

const AGENTS = [
  { id: "E", label: "Extractor" },
  { id: "P", label: "Price" },
  { id: "M", label: "Medical" },
  { id: "F", label: "Fraud" },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle, rgb(15 61 44 / 0.18) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />

      <section className="relative mx-auto flex max-w-[1120px] flex-col gap-10 px-4 pb-16 pt-12 md:pt-16">
        <div className="cg-blur-in max-w-2xl">
          <div className="mb-6 flex items-center gap-3">
            <ClaimGuardMark size={56} />
            <div>
              <p className="font-display text-3xl font-semibold tracking-tight text-leaf-deep md:text-4xl">
                ClaimGuard
              </p>
              <Badge tone="leaf" className="mt-1">
                Powered by Gemma 4 · open weights
              </Badge>
            </div>
          </div>

          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink md:text-5xl">
            Catch padded hospital bills in seconds.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-muted">
            ClaimGuard reads a Nigerian hospital bill with Gemma 4, checks sample tariffs and
            clinical fit, then scores fraud risk — so claims officers spend time on real
            exceptions.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/audit">
              <Button size="lg">Audit a bill</Button>
            </Link>
            <a href="https://github.com/drizzy765/claimguard" target="_blank" rel="noreferrer">
              <Button variant="secondary" size="lg">
                <Github size={18} /> View on GitHub
              </Button>
            </a>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/audit?sample=bill_padded.json">
              <Button variant="secondary" size="sm">
                Try padded → FRAUD RISK
              </Button>
            </Link>
            <Link to="/audit?sample=bill_clean.json">
              <Button variant="secondary" size="sm">
                Try clean → CLEAN
              </Button>
            </Link>
          </div>

          <p className="mt-6 max-w-lg text-sm text-ink-muted">
            MIT licensed. Built for Hacktoberfest Hack Day. Synthetic sample bills only — never
            real patient data. One-click demos need your FACTORY_MASTER_KEY in Settings.
          </p>
        </div>

        <div className="cg-blur-in rounded-[12px] border border-line bg-surface/80 p-6 backdrop-blur-sm" style={{ animationDelay: "80ms" }}>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Four-agent pipeline
          </p>
          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
            {AGENTS.map((a, i) => (
              <div key={a.id} className="flex flex-1 items-center gap-3 md:flex-col md:gap-2">
                <div className="flex size-12 items-center justify-center rounded-full border border-leaf/30 bg-leaf/10 font-display text-lg font-semibold text-leaf">
                  {a.id}
                </div>
                <span className="text-sm font-medium">{a.label}</span>
                {i < AGENTS.length - 1 && (
                  <svg
                    className="hidden h-3 flex-1 text-leaf md:block"
                    viewBox="0 0 100 12"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      className="cg-beam-path"
                      d="M0 6 H100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-ink-muted md:text-left">
            Extractor → Price check ‖ Medical logic → Fraud scorer · POST /audit
          </p>
        </div>
      </section>
    </div>
  );
}
