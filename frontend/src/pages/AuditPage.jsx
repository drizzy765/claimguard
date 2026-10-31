import { useEffect } from "react";
import { Info } from "lucide-react";
import Dropzone from "@/components/audit/Dropzone";
import SampleBills from "@/components/audit/SampleBills";
import AgentRunRail from "@/components/audit/AgentRunRail";
import AuditReport from "@/components/audit/AuditReport";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useAudit } from "@/hooks/useAudit";
import { verdictTone } from "@/lib/utils";

export default function AuditPage({
  apiBase,
  apiKey,
  onHistory,
  setScanning,
  setMarkTone,
}) {
  const audit = useAudit({
    apiBase,
    apiKey,
    onComplete: (data, file) => {
      onHistory?.({
        id: Date.now(),
        at: new Date().toISOString(),
        filename: file?.name,
        hospital: data.extracted?.hospital,
        verdict: data.fraud?.verdict,
        score: data.fraud?.score,
        savings: data.fraud?.potential_savings_ngn,
        report: data,
      });
    },
  });

  useEffect(() => {
    setScanning?.(audit.running);
    if (audit.report) setMarkTone?.(verdictTone(audit.report.fraud?.verdict));
    else if (!audit.running) setMarkTone?.("default");
  }, [audit.running, audit.report, setScanning, setMarkTone]);

  return (
    <div className="mx-auto max-w-[1040px] space-y-6 px-4 py-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Audit a claim</h1>
        <p className="mt-1 text-ink-muted">
          Upload a hospital bill photo or try a synthetic sample. Four agents return a CLEAN,
          REVIEW, or FRAUD RISK verdict.
        </p>
      </div>

      <Dropzone
        file={audit.file}
        preview={audit.preview}
        onPick={audit.pickFile}
        disabled={audit.running}
      />

      <SampleBills apiBase={apiBase} onPick={audit.pickFile} disabled={audit.running} />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={audit.runAudit} disabled={!audit.file || audit.running}>
          {audit.running ? "Auditing…" : "Run audit"}
        </Button>
        {audit.file && (
          <span className="text-sm text-ink-muted">{audit.file.name}</span>
        )}
      </div>

      {audit.error && (
        <Alert tone="error" icon={<Info size={16} />}>
          {audit.error}
        </Alert>
      )}

      {(audit.running || audit.logs.length > 0) && (
        <>
          <p className="text-sm font-medium text-ink">
            {audit.running ? "Agents are reviewing this claim…" : "Pipeline finished."}
          </p>
          <AgentRunRail
            steps={audit.STEP_DEFS}
            activeStep={audit.activeStep}
            logs={audit.logs}
            running={audit.running}
          />
        </>
      )}

      <AuditReport
        report={audit.report}
        preview={audit.preview}
        onRerun={audit.runAudit}
      />
    </div>
  );
}
