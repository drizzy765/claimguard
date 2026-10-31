import { useEffect, useState } from "react";

export function useHealth(apiBase) {
  const [status, setStatus] = useState("checking");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("checking");
      try {
        const r = await fetch(`${apiBase}/health`);
        const j = await r.json();
        if (!cancelled) {
          setInfo(j);
          setStatus(j.status === "OK" ? "online" : "degraded");
        }
      } catch {
        if (!cancelled) {
          setInfo(null);
          setStatus("offline");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  return { status, info };
}
