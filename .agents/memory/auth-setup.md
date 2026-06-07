---
name: Auth real con passport-local
description: Autenticación con sesiones en PostgreSQL, hashing SHA-256, y seed de usuarios iniciales
---

## Implementación

- `server/auth.ts`: configura passport-local, sesiones con connect-pg-simple (tabla `user_sessions`), endpoints `/api/login`, `/api/logout`, `/api/me`
- Hash: SHA-256 con salt fijo `eea-salt-2024` (función `hashPassword`)
- `server/index.ts`: llama `setupAuth(app)` ANTES de `registerRoutes`, luego `seedUsers()`
- `client/src/lib/auth.ts`: Zustand store con `login/logout/checkSession` que llaman a la API real; persistido como `eea-auth-v2`
- `client/src/App.tsx`: llama `checkSession()` al montar para restaurar sesión del servidor

## Credenciales por defecto
- admin / admin123 (role: admin)
- operador / op123 (role: operator)

## User type (frontend)
```ts
{ id: string; username: string; role: "admin" | "operator" }
```
Nota: ya NO tiene campo `name` — usar `username` en el layout.

**Why:** El proyecto requería auth real para producción; el mock Zustand con admin/admin era inseguro.

**How to apply:** Si se agregan usuarios nuevos, usar `hashPassword()` exportada de `server/auth.ts` para generar el hash antes de insertarlos.
