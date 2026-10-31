import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/AppShell";
import SettingsDialog from "@/components/SettingsDialog";
import LandingPage from "@/pages/LandingPage";
import AuditPage from "@/pages/AuditPage";
import HistoryPage from "@/pages/HistoryPage";
import AboutPage from "@/pages/AboutPage";
import { useHealth } from "@/hooks/useHealth";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { defaultApiBase, defaultApiKey } from "@/lib/utils";

const RENDER_HOST = "https://claimguard-sfxx.onrender.com";

function initialApiBase() {
  const fallback = defaultApiBase();
  const stored = (localStorage.getItem("CG_API_BASE") || "").trim();
  const onVercel =
    typeof window !== "undefined" && /\.vercel\.app$/i.test(window.location.hostname);

  // Judges on Vercel: always use same-origin proxy unless they set a custom host.
  if (onVercel) {
    if (!stored || stored === RENDER_HOST || stored.startsWith(RENDER_HOST)) {
      return "/cg-api";
    }
    return stored;
  }

  return stored || fallback;
}

function initialApiKey() {
  // Always use the live Render demo key so stale localStorage cannot 401 judges.
  const demo = defaultApiKey();
  try {
    localStorage.setItem("FACTORY_MASTER_KEY", demo);
  } catch {
    /* ignore */
  }
  return demo;
}

export default function App() {
  const [apiBase, setApiBase] = useState(initialApiBase);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [markTone, setMarkTone] = useState("default");
  const { status, refetch } = useHealth(apiBase);
  const history = useLocalHistory();

  useEffect(() => {
    localStorage.setItem("CG_API_BASE", apiBase);
  }, [apiBase]);

  useEffect(() => {
    localStorage.setItem("FACTORY_MASTER_KEY", apiKey);
  }, [apiKey]);

  return (
    <BrowserRouter>
      <AppShell
        health={status}
        onOpenSettings={() => setSettingsOpen(true)}
        onRetryHealth={refetch}
        scanning={scanning}
        markTone={markTone}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/audit"
            element={
              <AuditPage
                apiBase={apiBase}
                apiKey={apiKey}
                onHistory={history.push}
                setScanning={setScanning}
                setMarkTone={setMarkTone}
                onNeedSettings={() => setSettingsOpen(true)}
              />
            }
          />
          <Route
            path="/history"
            element={<HistoryPage items={history.items} clear={history.clear} />}
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiBase={apiBase}
        setApiBase={setApiBase}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
    </BrowserRouter>
  );
}
