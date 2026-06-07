import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW registrado:', reg.scope);
        window.addEventListener('online', () => {
          if ('sync' in reg) {
            (reg as any).sync.register('sync-inspections');
          }
        });
      })
      .catch(err => console.warn('SW no pudo registrarse:', err));
  });
}
