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
import { defaultApiBase } from "@/lib/utils";

function initialApiBase() {
  const stored = localStorage.getItem("CG_API_BASE");
  const fallback = defaultApiBase();
  // On Vercel, prefer same-origin /cg-api proxy (avoids browser CORS flakiness).
  const onVercel =
    typeof window !== "undefined" && /\.vercel\.app$/i.test(window.location.hostname);
  if (onVercel) {
    const renderHost = "https://claimguard-sfxx.onrender.com";
    if (!stored || stored === renderHost || stored.startsWith(renderHost)) {
      return "/cg-api";
    }
  }
  return stored || fallback;
}

export default function App() {
  const [apiBase, setApiBase] = useState(initialApiBase);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("FACTORY_MASTER_KEY") || "");
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
