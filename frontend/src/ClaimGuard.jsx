import React, { useEffect, useRef, useState } from "react";

const STEPS = [
  { id: "extractor", label: "Extractor", detail: "Gemma 4 vision → line items" },
  { id: "price_checker", label: "Price check", detail: "Sample tariff match" },
  { id: "medical_logic", label: "Medical logic", detail: "Fit vs diagnosis" },
  { id: "fraud_scorer", label: "Fraud score", detail: "Rules + summary" },
];

function verdictClass(v) {
  if (v === "APPROVE") return "verdict-approve";
  if (v === "REJECT") return "verdict-reject";
  return "verdict-review";
}

export default function ClaimGuard() {
  const [backendUrl, setBackendUrl] = useState(
    import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ""
      ? import.meta.env.VITE_API_URL
      : import.meta.env.PROD
        ? "" // same-origin when served from FastAPI/Docker
        : "http://127.0.0.1:8000"
  );
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("FACTORY_MASTER_KEY") || ""
  );
  const [health, setHealth] = useState("checking");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const stepTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem("FACTORY_MASTER_KEY", apiKey);
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${backendUrl}/health`);
        const j = await r.json();
        if (!cancelled) setHealth(j.status === "OK" ? "online" : "degraded");
      } catch {
        if (!cancelled) setHealth("offline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendUrl]);

  useEffect(() => () => clearInterval(stepTimer.current), []);

  const onPick = (f) => {
    setFile(f);
    setReport(null);
    setError(null);
    if (f && f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const runAudit = async () => {
    if (!file || running) return;
    if (!apiKey) {
      setError("Set X-Factory-API-Key (FACTORY_MASTER_KEY) before auditing.");
      return;
    }
    setRunning(true);
    setError(null);
    setReport(null);
    setActiveStep(0);
    let idx = 0;
    clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => {
      idx = Math.min(idx + 1, STEPS.length - 1);
      setActiveStep(idx);
    }, 700);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${backendUrl}/audit`, {
        method: "POST",
        headers: { "X-Factory-API-Key": apiKey },
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
      clearInterval(stepTimer.current);
      setActiveStep(STEPS.length);
      setReport(data);
    } catch (e) {
      clearInterval(stepTimer.current);
      setActiveStep(-1);
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  const modelLabel = report?.model
    ? String(report.model).includes("gemma4") || String(report.model).includes(":")
      ? "Gemma 4 · self-hosted"
      : "Gemma 4 · Gemini API"
    : null;

  return (
    <div className="cg-page">
      <div className="cg-bg" aria-hidden="true" />

      <header className="cg-header">
        <div className="cg-brand">
          <span className="cg-mark">CG</span>
          <div>
            <h1 className="cg-title">ClaimGuard</h1>
            <p className="cg-tag">Nigerian HMO bill auditor · Gemma 4</p>
          </div>
        </div>
        <div className="cg-health" data-status={health}>
          <span className="cg-dot" />
          {health}
        </div>
      </header>

      <section className="cg-hero">
        <p className="cg-lede">
          Upload a hospital bill. Four agents extract lines, check sample tariffs,
          judge clinical fit, and score fraud — verdict in seconds.
        </p>
      </section>

      <section className="cg-controls">
        <label className="cg-field">
          <span>API host</span>
          <input
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="http://127.0.0.1:8000"
          />
        </label>
        <label className="cg-field">
          <span>X-Factory-API-Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="FACTORY_MASTER_KEY"
          />
        </label>
      </section>

      <section className="cg-upload">
        <div
          className="cg-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) onPick(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.json"
            hidden
            onChange={(e) => e.target.files[0] && onPick(e.target.files[0])}
          />
          {preview ? (
            <img src={preview} alt="Bill preview" className="cg-preview" />
          ) : (
            <p>
              Drop bill image or JSON sample
              <br />
              <small>JPG / PNG / sample_bills/*.json · max 5 MB</small>
            </p>
          )}
        </div>
        <div className="cg-actions">
          <button
            type="button"
            className="cg-cta"
            disabled={!file || running}
            onClick={runAudit}
          >
            {running ? "Auditing…" : "Run audit"}
          </button>
          {file && (
            <span className="cg-filename">{file.name}</span>
          )}
        </div>
      </section>

      <section className="cg-steps" aria-label="Agent pipeline">
        {STEPS.map((s, i) => {
          const state =
            activeStep > i || (report && activeStep >= STEPS.length)
              ? "done"
              : activeStep === i
                ? "active"
                : "idle";
          return (
            <div key={s.id} className={`cg-step ${state}`}>
              <strong>{s.label}</strong>
              <span>{s.detail}</span>
            </div>
          );
        })}
      </section>

      {error && <div className="cg-error">{error}</div>}

      {report && (
        <section className="cg-report">
          <div className="cg-report-head">
            <span className={`cg-verdict ${verdictClass(report.fraud?.verdict)}`}>
              {report.fraud?.verdict}
            </span>
            <div className="cg-meta">
              <span>Score {report.fraud?.score}/100</span>
              <span>₦{Number(report.fraud?.potential_savings_ngn || 0).toLocaleString()} potential savings</span>
              <span>{report.latency_ms} ms</span>
              {modelLabel && <span>{modelLabel}</span>}
            </div>
          </div>
          <p className="cg-summary">{report.fraud?.summary}</p>

          <h2>Flagged lines</h2>
          {(report.fraud?.flags || []).length === 0 ? (
            <p className="cg-muted">No flags.</p>
          ) : (
            <table className="cg-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Type</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {report.fraud.flags.map((f, i) => (
                  <tr key={i}>
                    <td>{f.line ?? "—"}</td>
                    <td>{f.type}</td>
                    <td>{f.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2>Extracted items</h2>
          <table className="cg-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Amount</th>
                <th>Price flag</th>
                <th>Clinical</th>
              </tr>
            </thead>
            <tbody>
              {(report.extracted?.items || []).map((it) => {
                const price = (report.pricing?.lines || []).find((l) => l.line === it.line);
                const med = (report.medical?.lines || []).find((l) => l.line === it.line);
                return (
                  <tr key={it.line}>
                    <td>{it.line}</td>
                    <td>{it.description}</td>
                    <td>{it.qty}</td>
                    <td>{it.unit_price}</td>
                    <td>{it.amount}</td>
                    <td>{price?.flag || "—"}</td>
                    <td>{med?.fit || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="cg-disclaimer">
            Sample tariffs only — not official NHIA. Not medical advice. Synthetic demo bills.
          </p>
        </section>
      )}

      <footer className="cg-footer">
        ClaimGuard · MIT · Hacktoberfest Hack Day · built on agent-factory chassis
      </footer>
    </div>
  );
}
