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

export function defaultApiBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env !== undefined && env !== "") return String(env).replace(/\/$/, "");
  // Deployed ClaimGuard API (Render)
  return "https://claimguard-sfxx.onrender.com";
}
