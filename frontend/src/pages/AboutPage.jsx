import Alert from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Github } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[800px] space-y-6 px-4 py-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">How ClaimGuard works</h1>
        <p className="mt-2 text-ink-muted">
          Open-source HMO claim auditor on the agent-factory chassis, powered by Gemma 4.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-ink p-4 font-mono text-xs leading-relaxed text-[#E8F0EA]">
{`Bill photo → POST /audit
  → Extractor (Gemma 4 vision)
  → Price check ‖ Medical logic
  → Fraud rules (Python) + summary
  → AuditReport JSON`}
          </pre>
          <p className="mt-3 text-sm text-ink-muted">
            Auth header: <code className="font-mono">X-Factory-API-Key</code>. Health:{" "}
            <code className="font-mono">GET /health</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Gemma 4 <Badge tone="leaf">open weights</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-muted">
          <p>
            Primary: Gemini API <code className="font-mono">gemma-4-31b-it</code> via OpenAI-compatible
            endpoint. Automatic Groq fallback when Gemini is rate-limited or out of credits.
          </p>
          <p>
            Optional self-hosted Ollama (<code className="font-mono">gemma4:12b</code>) via{" "}
            <code className="font-mono">LLM_FALLBACK_*</code> env vars — patient data can stay on your
            server.
          </p>
        </CardContent>
      </Card>

      <Alert tone="warn">
        <strong className="block text-ink">Sample data disclaimer</strong>
        <span className="text-ink-muted">
          <code className="font-mono">data/tariffs_sample.csv</code> holds illustrative naira price
          ranges for demos. It is not an official NHIA tariff schedule. ClaimGuard does not replace
          licensed clinical or claims adjudication. Synthetic bills only — no real patient data.
        </span>
      </Alert>

      <a href="https://github.com/drizzy765/claimguard" target="_blank" rel="noreferrer">
        <Button variant="secondary">
          <Github size={16} /> MIT · GitHub
        </Button>
      </a>
    </div>
  );
}
