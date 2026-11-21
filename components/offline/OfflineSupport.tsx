"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function OfflineSupport() {
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Offline enhancements are progressive; the online app remains usable.
      });
    }

    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className={`offline-status ${online ? "is-online" : "is-offline"}`} role="status" aria-live="polite">
      {online ? <Wifi size={13} /> : <WifiOff size={13} />}
      <span>{online ? (installed ? "Klin installed · Online" : "Online") : "Offline · Local drafts only"}</span>
    </div>
  );
}