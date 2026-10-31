import { useCallback, useEffect, useState } from "react";

export function useHealth(apiBase) {
  const [status, setStatus] = useState("checking");
  const [info, setInfo] = useState(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

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
  }, [apiBase, tick]);

  return { status, info, refetch };
}
