import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        window.addEventListener('online', () => {
          if ('sync' in reg) {
            (reg as any).sync.register('sync-inspections');
          }
        });
      })
      .catch(err => console.warn('SW no pudo registrarse:', err));

    // Force reload when a new SW takes control so stale bundles are never served
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
