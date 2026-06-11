import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import logoUrl from "@assets/image_1773940561975.png";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');

  .lp-root {
    display: flex;
    flex-direction: row;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
  }

  /* ── LEFT PANEL ── */
  .lp-left {
    flex: 1.1;
    background: #07111f;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 36px;
    overflow: hidden;
  }
  .lp-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .lp-left-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 36px;
  }
  .lp-logo-box {
    width: 200px;
    height: 200px;
    background: #ffffff;
    border-radius: 20px;
    border: 1px solid rgba(0,210,150,0.25);
    box-shadow: 0 0 60px rgba(0,210,150,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .lp-logo-box img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .lp-metrics {
    display: flex;
    align-items: center;
    gap: 0;
  }
  .lp-metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0 24px;
  }
  .lp-metric:not(:last-child) {
    border-right: 1px solid rgba(255,255,255,0.1);
  }
  .lp-metric-value {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: #00D296;
    letter-spacing: 0.5px;
  }
  .lp-metric-label {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 500;
    font-size: 10px;
    color: rgba(255,255,255,0.35);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  /* ── RIGHT PANEL ── */
  .lp-right {
    flex: 0.9;
    background: #0b1928;
    border-left: 1px solid rgba(0,210,150,0.07);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 40px;
  }
  .lp-form-wrap {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  /* Header */
  .lp-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lp-tag {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #00D296;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
  }
  .lp-title {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 28px;
    color: #ffffff;
    line-height: 1.1;
    margin: 0;
  }
  .lp-subtitle {
    font-size: 13px;
    color: rgba(255,255,255,0.35);
    font-weight: 400;
    margin: 0;
  }

  /* Fields */
  .lp-fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .lp-field {
    position: relative;
  }
  .lp-field-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255,255,255,0.3);
    pointer-events: none;
    display: flex;
    align-items: center;
  }
  .lp-input {
    width: 100%;
    box-sizing: border-box;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 12px 14px 12px 42px;
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 400;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
  }
  .lp-input::placeholder {
    color: rgba(255,255,255,0.2);
  }
  .lp-input:focus {
    border-color: rgba(0,210,150,0.4);
    background: rgba(0,210,150,0.04);
  }
  .lp-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Error */
  .lp-error {
    background: rgba(255,107,107,0.08);
    border: 1px solid rgba(255,107,107,0.2);
    border-radius: 8px;
    color: #ff6b6b;
    font-size: 13px;
    padding: 10px 14px;
  }

  /* Button */
  .lp-btn {
    width: 100%;
    padding: 13px 0;
    background: #00D296;
    color: #07111f;
    border: none;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .lp-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .lp-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  .lp-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Status badge */
  .lp-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0,210,150,0.04);
    border: 1px solid rgba(0,210,150,0.1);
    border-radius: 8px;
    padding: 10px 14px;
  }
  .lp-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #00D296;
    flex-shrink: 0;
    animation: lp-pulse 2s ease-in-out infinite;
  }
  .lp-badge-text {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    font-weight: 400;
    line-height: 1.4;
  }
  .lp-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(7,17,31,0.3);
    border-top-color: #07111f;
    border-radius: 50%;
    animation: lp-spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes lp-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes lp-spin {
    to { transform: rotate(360deg); }
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .lp-root {
      flex-direction: column;
    }
    .lp-left {
      min-height: 280px;
      flex: none;
    }
    .lp-logo-box {
      width: 140px;
      height: 140px;
    }
    .lp-right {
      flex: none;
      border-left: none;
      border-top: 1px solid rgba(0,210,150,0.07);
      padding: 36px 24px;
    }
  }
`;

// ── Node network canvas ──
function NodeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let rafId = 0;

    const nodes = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      r: 1.2 + Math.random() * 2,
    }));

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      for (const n of nodes) {
        n.x += n.vx / W * 100;
        n.y += n.vy / H * 100;
        if (n.x < 0 || n.x > 1) { n.vx *= -1; n.x = Math.max(0, Math.min(1, n.x)); }
        if (n.y < 0 || n.y > 1) { n.vy *= -1; n.y = Math.max(0, Math.min(1, n.y)); }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ax = nodes[i].x * W, ay = nodes[i].y * H;
          const bx = nodes[j].x * W, by = nodes[j].y * H;
          const dist = Math.hypot(ax - bx, ay - by);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.12;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(0,210,150,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,210,150,0.55)";
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-canvas" />;
}

// ── User icon SVG ──
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const setUser     = useAuth((s) => s.setUser);
  const setLoading  = useAuth((s) => s.setLoading);
  const isLoading   = useAuth((s) => s.isLoading);
  const user        = useAuth((s) => s.user);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setLocation("/");
      } else {
        setLoading(false);
        setError(data.message || "Usuario o contraseña incorrectos");
      }
    } catch {
      setLoading(false);
      setError("Error de conexión. Intentá de nuevo.");
    }
  };

  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !isLoading;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="lp-root">
        {/* ── LEFT PANEL ── */}
        <div className="lp-left">
          <NodeCanvas />
          <div className="lp-left-content">
            <div className="lp-logo-box">
              <img src={logoUrl} alt="Logo EEA" />
            </div>
            <div className="lp-metrics">
              <div className="lp-metric">
                <span className="lp-metric-value">9+</span>
                <span className="lp-metric-label">Servicios</span>
              </div>
              <div className="lp-metric">
                <span className="lp-metric-value">SRT</span>
                <span className="lp-metric-label">Normativa</span>
              </div>
              <div className="lp-metric">
                <span className="lp-metric-value">24/7</span>
                <span className="lp-metric-label">Sistema</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="lp-right">
          <form className="lp-form-wrap" onSubmit={handleLogin}>
            <div className="lp-header">
              <span className="lp-tag">Acceso Seguro</span>
              <h1 className="lp-title">Sistema de Gestión</h1>
              <p className="lp-subtitle">Higiene Ocupacional y Medio Ambiente</p>
            </div>

            <div className="lp-fields">
              <div className="lp-field">
                <span className="lp-field-icon"><IconUser /></span>
                <input
                  className="lp-input"
                  type="text"
                  placeholder="Usuario"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  data-testid="input-username"
                />
              </div>
              <div className="lp-field">
                <span className="lp-field-icon"><IconLock /></span>
                <input
                  className="lp-input"
                  type="password"
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  data-testid="input-password"
                />
              </div>
            </div>

            {error && (
              <div className="lp-error" data-testid="alert-login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="lp-btn"
              disabled={!canSubmit}
              data-testid="button-login"
            >
              {isLoading ? (
                <><span className="lp-spinner" /> Ingresando…</>
              ) : "Ingresar"}
            </button>

            <div className="lp-badge">
              <span className="lp-dot" />
              <span className="lp-badge-text">
                Sistema activo · Protocolos SRT vigentes · Sesión cifrada
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
