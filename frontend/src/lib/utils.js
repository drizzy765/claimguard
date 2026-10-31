import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function verdictLabel(apiVerdict) {
  if (apiVerdict === "APPROVE") return "CLEAN";
  if (apiVerdict === "REJECT") return "FRAUD RISK";
  return "REVIEW";
}

export function verdictTone(apiVerdict) {
  if (apiVerdict === "APPROVE") return "clean";
  if (apiVerdict === "REJECT") return "fraud";
  return "review";
}

export function formatNaira(n) {
  const v = Number(n) || 0;
  return `₦${v.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

/** Human label for judges: how Gemma / fallback was used */
export function modelLabel(model) {
  const m = String(model || "").toLowerCase();
  if (!m || m === "rules-only" || m.includes("rules")) {
    return "Rules-only (no LLM)";
  }
  if (m.includes("gemma-4") || m.includes("gemma4")) {
    if (m.includes(":") || m.includes("ollama")) {
      return "Gemma 4 · self-hosted";
    }
    return "Gemma 4 · Gemini API";
  }
  if (m.includes("llama") || m.includes("groq")) {
    return "Groq fallback";
  }
  return String(model);
}

export function defaultApiBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env !== undefined && env !== "") return String(env).replace(/\/$/, "");
  // Deployed ClaimGuard API (Render)
  return "https://claimguard-sfxx.onrender.com";
}
