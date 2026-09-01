import "dotenv/config";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { handler } from "./index.js";
import { db } from "./neonDb.js";
import { ApiError } from "./runtime.js";

const port = Number(process.env.API_PORT ?? 3001);
const jwtSecret = process.env.AUTH_JWT_SECRET;
const superadminEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const superadminPassword = process.env.SUPERADMIN_PASSWORD;

if (!jwtSecret || !superadminEmail || !superadminPassword) {
  throw new Error("AUTH_JWT_SECRET, SUPERADMIN_EMAIL, and SUPERADMIN_PASSWORD must be configured.");
}

type AuthUser = { userId: string; email: string; name: string };

async function ensureSuperadmin() {
  const { items } = await db.list<any>("users", { filter: { email: superadminEmail }, limit: 1 });
  const passwordHash = await bcrypt.hash(superadminPassword, 12);
  if (items[0]) {
    await db.update("users", [{ id: items[0].id, record: { ...items[0], authUserId: items[0].authUserId || `auth-${items[0].id}`, name: "Sir Lord Phick", role: "superadmin", status: "active", passwordHash } }]);
    return;
  }
  const authUserId = `auth-${randomUUID()}`;
  await db.add("users", [{ authUserId, email: superadminEmail, name: "Sir Lord Phick", role: "superadmin", status: "active", createdAt: Date.now(), passwordHash }]);
}

function authenticate(request: express.Request): AuthUser | undefined {
  const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return undefined;
  try {
    return jwt.verify(token, jwtSecret) as unknown as AuthUser;
  } catch {
    return undefined;
  }
}

function matchRoute(method: string, path: string) {
  for (const [key, chain] of Object.entries(handler as Record<string, any[]>)) {
    const [routeMethod, routePath] = key.split(" ");
    if (routeMethod !== method) continue;
    const names: string[] = [];
    const expression = `^${routePath.replace(/:[^/]+/g, (part) => {
      names.push(part.slice(1));
      return "([^/]+)";
    })}$`;
    const match = path.match(new RegExp(expression));
    if (match) return { chain, params: Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])])) };
  }
  return undefined;
}

const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const identifier = String(request.body.identifier ?? "").trim().toLowerCase();
    const password = String(request.body.password ?? "");
    const { items } = await db.list<any>("users", { limit: 1000 });
    const profile = items.find((user) => user.email?.toLowerCase() === identifier || user.phone === request.body.identifier);
    if (!profile?.passwordHash || !(await bcrypt.compare(password, profile.passwordHash))) throw new ApiError(401, "Invalid email or password.");
    if (profile.status === "suspended") throw new ApiError(403, "This account is suspended.");
    const token = jwt.sign({ userId: profile.authUserId, email: profile.email, name: profile.name }, jwtSecret, { expiresIn: "7d" });
    response.json({ token, profile: { ...profile, passwordHash: undefined } });
  } catch (exception) {
    next(exception);
  }
});

app.post("/api/auth/register", async (request, response, next) => {
  try {
    const body = request.body as { name?: string; phone?: string; password?: string; county?: string; dob?: string; guidingUnit?: string; gender?: string };
    if (!body.name?.trim() || !body.phone?.trim() || !body.password) throw new ApiError(400, "Name, phone number, and password are required.");
    const { items } = await db.list<any>("users", { limit: 1000 });
    if (items.some((user) => user.phone === body.phone.trim())) throw new ApiError(409, "A learner with this phone number already exists.");
    const authUserId = `auth-${randomUUID()}`;
    const profile = { authUserId, email: `${body.phone.replace(/\D/g, "")}@student.kgga.local`, name: body.name.trim(), role: "learner", status: "active", createdAt: Date.now(), phone: body.phone.trim(), county: body.county ?? "", dob: body.dob ?? "", guidingUnit: body.guidingUnit ?? "", gender: body.gender ?? "", passwordHash: await bcrypt.hash(body.password, 12) };
    const [id] = await db.add("users", [profile]);
    response.status(201).json({ profile: { id, ...profile, passwordHash: undefined } });
  } catch (exception) {
    next(exception);
  }
});

app.use("/api", async (request, response, next) => {
  try {
    const route = matchRoute(request.method, `/api${request.path}`);
    if (!route) throw new ApiError(404, "Route not found.");
    const requiresAuth = route.chain.some((item: any) => item?.requiresAuth);
    const user = authenticate(request);
    if (requiresAuth && !user) throw new ApiError(401, "Authentication required.");
    const action = route.chain.find((item): item is (context: any) => Promise<unknown> => typeof item === "function");
    if (!action) throw new ApiError(500, "Route handler is missing.");
    response.json(await action({ user, body: request.body, params: route.params }));
  } catch (exception) {
    next(exception);
  }
});

app.use((exception: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const error = exception instanceof ApiError ? exception : new ApiError(500, "Unexpected server error.");
  if (!(exception instanceof ApiError)) console.error(exception);
  response.status(error.status).json({ error: error.message });
});

await ensureSuperadmin();

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`KGGA Neon API listening on http://127.0.0.1:${port}`));
}