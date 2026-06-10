import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db } from "./storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// scrypt hash format: "hash.salt"
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${hash}.${salt}`;
}

function verifyPassword(password: string, stored: string): boolean {
  // Soporte para hashes legacy sha256 (sin punto separador)
  if (!stored.includes(".")) {
    const legacy = crypto.createHash("sha256").update(password + "eea-salt-2024").digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(legacy, "hex"), Buffer.from(stored, "hex"));
    } catch {
      return false;
    }
  }
  const [hash, salt] = stored.split(".");
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export async function seedDefaultUsers() {
  const existing = await db.select().from(users);
  if (existing.length === 0) {
    await db.insert(users).values([
      { username: "admin", password: hashPassword("admin123"), role: "admin", name: "Administrador" },
      { username: "operador", password: hashPassword("op123"), role: "operator", name: "Operador" },
    ]);
    console.log("[auth] Usuarios iniciales creados: admin / operador");
  } else {
    // Migrar hashes legacy sha256 → scrypt
    let migrated = 0;
    for (const u of existing) {
      if (!u.password.includes(".")) {
        const defaultPass = u.username === "admin" ? "admin123" : "op123";
        await db.update(users)
          .set({ password: hashPassword(defaultPass) })
          .where(eq(users.id, u.id));
        migrated++;
      }
    }
    if (migrated > 0) console.log(`[auth] ${migrated} contraseñas migradas a scrypt`);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "No autorizado" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as any)?.role === "admin") return next();
  res.status(403).json({ message: "Acceso denegado" });
}

export function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);

  app.use(session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "eea-session-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      if (!user) return done(null, false, { message: "Usuario no encontrado" });
      if (!verifyPassword(password, user.password)) return done(null, false, { message: "Contraseña incorrecta" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.id));

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });
}

function userPayload(u: any) {
  return { id: u.id, username: u.username, role: u.role, name: u.name || u.username };
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Credenciales inválidas" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.json({ user: userPayload(user) });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => res.json({ ok: true }));
    });
  });

  app.get("/api/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autenticado" });
    res.json(userPayload(req.user));
  });

  app.post("/api/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Se requieren currentPassword y newPassword" });
    }
    const me = req.user as any;
    const [dbUser] = await db.select().from(users).where(eq(users.id, me.id));
    if (!dbUser || !verifyPassword(currentPassword, dbUser.password)) {
      return res.status(400).json({ message: "Contraseña actual incorrecta" });
    }
    await db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, me.id));
    res.json({ ok: true });
  });

  app.get("/api/users", requireAdmin, async (_req, res) => {
    const all = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      name: users.name,
      createdAt: users.createdAt,
    }).from(users);
    res.json(all);
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    const { username, password, role, name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "username y password son requeridos" });
    }
    const [created] = await db.insert(users).values({
      username,
      password: hashPassword(password),
      role: role || "operator",
      name: name || username,
    }).returning({ id: users.id, username: users.username, role: users.role, name: users.name });
    res.status(201).json(created);
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    const me = req.user as any;
    if (req.params.id === me.id) {
      return res.status(400).json({ message: "No podés eliminarte a vos mismo" });
    }
    await db.delete(users).where(eq(users.id, req.params.id));
    res.json({ ok: true });
  });
}
