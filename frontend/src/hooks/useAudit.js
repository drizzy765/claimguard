import { useCallback, useRef, useState } from "react";
import { defaultApiKey } from "@/lib/utils";

const STEP_DEFS = [
  { id: "extractor", label: "Extractor", detail: "Gemma 4 vision reads line items" },
  { id: "price_checker", label: "Price check", detail: "Match against sample tariffs" },
  { id: "medical_logic", label: "Medical logic", detail: "Fit vs diagnosis" },
  { id: "fraud_scorer", label: "Fraud scorer", detail: "Rules + summary" },
];

export function useAudit({ apiBase, apiKey, onComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [logs, setLogs] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const fileRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const pickFile = useCallback((f) => {
    fileRef.current = f;
    setFile(f);
    setReport(null);
    setError(null);
    setLogs([]);
    setActiveStep(-1);
    if (f && f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }, []);

  const runAudit = useCallback(
    async (fileOverride) => {
      const active = fileOverride || fileRef.current || file;
      if (!active || running) return;
      const key = (apiKey || "").trim() || defaultApiKey();
      if (fileOverride) {
        fileRef.current = fileOverride;
        setFile(fileOverride);
      }
      setRunning(true);
      setError(null);
      setReport(null);
      setActiveStep(0);
      setLogs([
        { t: Date.now(), text: `Queued ${active.name}` },
        { t: Date.now(), text: "Extractor starting…" },
      ]);

      let idx = 0;
      clearTimer();
      timerRef.current = setInterval(() => {
        idx = Math.min(idx + 1, STEP_DEFS.length - 1);
        setActiveStep(idx);
        setLogs((prev) => [
          ...prev,
          { t: Date.now(), text: `${STEP_DEFS[idx].label} running…` },
        ]);
      }, 700);

      try {
        const fd = new FormData();
        fd.append("file", active);
        const r = await fetch(`${apiBase}/audit`, {
          method: "POST",
          headers: { "X-Factory-API-Key": key },
          body: fd,
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const detail = data.detail || `HTTP ${r.status}`;
          if (r.status === 401) {
            throw new Error("API key rejected. Use the same FACTORY_MASTER_KEY as the server.");
          }
          throw new Error(detail);
        }
        clearTimer();
        setActiveStep(STEP_DEFS.length);
        setLogs((prev) => [
          ...prev,
          {
            t: Date.now(),
            text: `Complete · ${data.fraud?.verdict} · score ${data.fraud?.score}`,
          },
        ]);
        setReport(data);
        onComplete?.(data, active);
      } catch (e) {
        clearTimer();
        setActiveStep(-1);
        const msg = e.message || String(e);
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("CORS")) {
          setError(
            "Cannot reach the ClaimGuard API (often a cold start or timeout — browsers call it CORS). Wait ~30s, press Retry in the header, then run again. Prefer a JSON sample over a photo for demos."
          );
        } else {
          setError(msg);
        }
      } finally {
        setRunning(false);
      }
    },
    [apiBase, apiKey, file, running, onComplete]
  );

  return {
    STEP_DEFS,
    file,
    preview,
    running,
    activeStep,
    logs,
    report,
    error,
    setError,
    pickFile,
    runAudit,
    setReport,
  };
}

export { STEP_DEFS };

export const ALLOWED_SAMPLES = [
  "bill_clean.json",
  "bill_honest_typhoid.json",
  "bill_padded.json",
  "bill_unrelated.json",
];
