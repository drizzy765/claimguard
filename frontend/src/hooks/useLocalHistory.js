import { useCallback, useState } from "react";

const KEY = "claimguard_history_v1";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function useLocalHistory() {
  const [items, setItems] = useState(() => load());

  const push = useCallback((entry) => {
    setItems((prev) => {
      const next = [entry, ...prev].slice(0, 40);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setItems([]);
  }, []);

  return { items, push, clear };
}
