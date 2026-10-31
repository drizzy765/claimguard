import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Printer,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import LineItemsTable from "@/components/audit/LineItemsTable";
import { formatNaira, modelLabel, verdictLabel, verdictTone } from "@/lib/utils";

function ScoreTicker({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(value);
      return;
    }
    let frame;
    const start = performance.now();
    const dur = 700;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="tabular">{n}</span>;
}

export default function AuditReport({ report, preview, onRerun }) {
  const [copied, setCopied] = useState(false);
  if (!report) return null;
  const tone = verdictTone(report.fraud?.verdict);
  const label = verdictLabel(report.fraud?.verdict);
  const Icon =
    tone === "clean" ? CheckCircle2 : tone === "fraud" ? ShieldAlert : AlertTriangle;
  const flagCount = (report.fraud?.flags || []).length;
  const savings = formatNaira(report.fraud?.potential_savings_ngn);
  const gemma = modelLabel(report.model);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claimguard-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySummary = async () => {
    const text = [
      `ClaimGuard audit: ${label} (${report.fraud?.verdict})`,
      `Score: ${report.fraud?.score}/100`,
      `Flags: ${flagCount}`,
      `Potential savings: ${savings}`,
      `Model: ${gemma} (${report.model || "—"})`,
      `Latency: ${report.latency_ms} ms`,
      report.fraud?.summary || "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const bannerMsg =
    tone === "clean"
      ? "No material fraud signals on sample tariffs."
      : tone === "fraud"
        ? "Do not auto-approve. Investigate flagged lines."
        : "Send to a human claims officer before payment.";

  return (
    <section className="cg-blur-in space-y-4 border-t border-line pt-6" aria-label="Audit report">
      <div
        className={`flex flex-wrap items-start gap-4 rounded-[10px] border px-4 py-4 ${
          tone === "clean"
            ? "border-clean/25 bg-clean-bg"
            : tone === "fraud"
              ? "border-fraud/25 bg-fraud-bg"
              : "border-review/25 bg-review-bg"
        }`}
      >
        <Icon
          className={
            tone === "clean" ? "text-clean" : tone === "fraud" ? "text-fraud" : "text-review"
          }
          size={28}
          strokeWidth={1.75}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{label}</h2>
            <Badge tone={tone}>{report.fraud?.verdict}</Badge>
            <Badge tone="leaf">{gemma}</Badge>
            <span className="text-xs tabular text-ink-muted">{report.latency_ms} ms</span>
          </div>
          <p className="mt-1 text-sm font-medium">{bannerMsg}</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {flagCount} flag{flagCount === 1 ? "" : "s"} · Potential savings{" "}
            <span className="tabular text-leaf-deep">{savings}</span>
          </p>
          <p className="mt-2 text-sm text-ink-muted">{report.fraud?.summary}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fraud score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold tabular">
              <ScoreTicker value={Number(report.fraud?.score || 0)} />
              <span className="text-lg text-ink-muted"> / 100</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Potential savings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold tabular">{savings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model · latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-ink">{gemma}</p>
            <p className="mt-1 text-xs text-ink-muted">{report.model || "—"}</p>
            <p className="mt-1 text-sm tabular text-ink-muted">{report.latency_ms} ms</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 font-display text-lg font-semibold">Flagged lines</h3>
        {(report.fraud?.flags || []).length === 0 ? (
          <p className="text-sm text-ink-muted">No line-level flags.</p>
        ) : (
          <ul className="space-y-2">
            {report.fraud.flags.map((f, i) => (
              <li key={i} className="rounded-md border border-line bg-surface px-3 py-2 text-sm">
                <Badge tone={f.type === "overpriced" || f.type === "unrelated" ? "fraud" : "review"}>
                  {f.type}
                </Badge>{" "}
                <span className="text-ink-muted">Line {f.line ?? "—"}</span>
                <div className="mt-1 text-ink">{f.detail}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-display text-lg font-semibold">Line items</h3>
        <LineItemsTable report={report} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-display text-lg font-semibold">Medical notes</h3>
          <Card>
            <CardContent className="space-y-2 pt-4">
              <p className="text-sm">
                <span className="text-ink-muted">Diagnosis: </span>
                {report.extracted?.diagnosis || "—"}
              </p>
              <p className="text-sm">
                <span className="text-ink-muted">Diagnosis supported: </span>
                {report.medical?.diagnosis_supported ? "Yes" : "No"}
              </p>
              <ul className="space-y-1 text-sm text-ink-muted">
                {(report.medical?.lines || []).map((m) => (
                  <li key={m.line}>
                    Line {m.line}: {m.fit} — {m.reason}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <div>
          <h3 className="mb-2 font-display text-lg font-semibold">Evidence</h3>
          <Card>
            <CardContent className="pt-4">
              {preview ? (
                <img
                  src={preview}
                  alt="Uploaded bill"
                  className="max-h-64 w-full rounded-md object-contain outline outline-1 outline-black/10"
                />
              ) : (
                <p className="text-sm text-ink-muted">
                  JSON sample run — no image preview. Flagged lines:{" "}
                  {(report.fraud?.flags || [])
                    .map((f) => f.line)
                    .filter(Boolean)
                    .join(", ") || "none"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Alert tone="warn">
        Tariff ranges are illustrative SAMPLE data, not official NHIA prices. ClaimGuard is not
        medical advice and does not replace licensed claims adjudication.
      </Alert>

      <div className="no-print flex flex-wrap gap-2">
        <Button variant="secondary" onClick={copySummary}>
          <Copy size={16} /> {copied ? "Copied" : "Copy summary"}
        </Button>
        <Button variant="secondary" onClick={exportJson}>
          <Download size={16} /> Export JSON
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={16} /> Print / PDF
        </Button>
        <Button variant="ghost" onClick={onRerun}>
          <RotateCcw size={16} /> Re-run
        </Button>
      </div>
    </section>
  );
}
