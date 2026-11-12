import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import {
  CopilotError,
  MAX_WEB_CALLS,
  MAX_OUTPUT_TOKENS,
  type Turn,
} from "./research";
import type { WebSource } from "../src/copilotTypes";

export interface Session {
  id: string;
  expires: number;
  turns: number;
  busy: boolean;
  history: Turn[];
  sources: WebSource[];
  guest?: boolean;
}
export class AttemptLimiter {
  private buckets = new Map<string, { start: number; count: number }>();
  constructor(
    private limit: number,
    private windowMs: number,
  ) {}
  allow(key: string, now = Date.now()) {
    for (const [id, b] of this.buckets)
      if (now - b.start >= this.windowMs) this.buckets.delete(id);
    const b = this.buckets.get(key) || { start: now, count: 0 };
    if (
      b.count >= this.limit ||
      (!this.buckets.has(key) && this.buckets.size >= 1000)
    )
      return false;
    b.count++;
    this.buckets.set(key, b);
    return true;
  }
}
export class AccessControl {
  private sessions = new Map<string, Session>();
  private loginLimit = new AttemptLimiter(8, 15 * 60 * 1000);
  private loginGlobal = new AttemptLimiter(60, 15 * 60 * 1000);
  readonly chatLimit = new AttemptLimiter(6, 60 * 1000);
  private guestSessionLimit = new AttemptLimiter(30, 24 * 60 * 60 * 1000);
  constructor(
    private code: string | undefined,
    private allowedOrigins: Set<string>,
    private guestUntil?: number,
  ) {}
  get judgeDemoEnabled() {
    return Boolean(this.configured && this.guestUntil && Date.now() < this.guestUntil);
  }
  get configured() {
    return Boolean(
      this.code && this.code.length >= 16 && this.code.length <= 200,
    );
  }
  checkOrigin(req: Request) {
    // No wildcard CORS or trust in X-Forwarded-For/Host. Explicitly configure HTTPS
    // preview origins if a reverse proxy is used; the default is loopback only.
    const origin = req.get("Origin");
    if (
      !origin ||
      !this.allowedOrigins.has(origin) ||
      req.get("X-Client-Signals") !== "copilot"
    )
      throw new CopilotError(
        403,
        "This copilot request origin is not authorized.",
      );
  }
  get(req: Request): Session | undefined {
    const raw = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("cs_copilot="))
      ?.slice("cs_copilot=".length);
    for (const [id, s] of this.sessions)
      if (s.expires < Date.now()) this.sessions.delete(id);
    return raw ? this.sessions.get(raw) : undefined;
  }
  login(req: Request, res: Response, code: unknown) {
    this.checkOrigin(req);
    if (
      !this.loginLimit.allow(req.ip || "unknown") ||
      !this.loginGlobal.allow("all")
    )
      throw new CopilotError(
        429,
        "Too many unlock attempts. Try again in 15 minutes.",
      );
    if (!this.configured)
      throw new CopilotError(
        503,
        "Copilot access control is not configured on the server.",
      );
    const provided =
      typeof code === "string" && code.length <= 200
        ? Buffer.from(code)
        : Buffer.alloc(0);
    const expected = Buffer.from(this.code!);
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    )
      throw new CopilotError(401, "Access code not accepted.");
    if (this.sessions.size >= 100)
      throw new CopilotError(503, "Demo session capacity reached.");
    const previous = this.get(req);
    if (previous) this.sessions.delete(previous.id);
    const id = randomBytes(32).toString("hex");
    this.sessions.set(id, {
      id,
      expires: Date.now() + 4 * 60 * 60 * 1000,
      turns: 0,
      busy: false,
      history: [],
      sources: [],
    });
    const secure = req.get("Origin")!.startsWith("https://");
    res.cookie("cs_copilot", id, {
      httpOnly: true,
      sameSite: "strict",
      secure,
      maxAge: 4 * 60 * 60 * 1000,
      path: "/api",
    });
  }
  guestLogin(req: Request, res: Response) {
    this.checkOrigin(req);
    if (!this.judgeDemoEnabled)
      throw new CopilotError(403, "Public judge demo access is disabled or expired.");
    // One guest session per browser, with no API request consumed at unlock.
    const previous = this.get(req);
    if (previous) return;
    if (!this.guestSessionLimit.allow("all"))
      throw new CopilotError(429, "Guest demo session capacity reached.");
    if (this.sessions.size >= 100)
      throw new CopilotError(503, "Demo session capacity reached.");
    const id = randomBytes(32).toString("hex");
    const maxAge = Math.min(
      30 * 60 * 1000,
      Math.max(0, this.guestUntil! - Date.now()),
    );
    if (maxAge <= 0)
      throw new CopilotError(403, "Judge demo access has expired.");
    this.sessions.set(id, {
      id,
      expires: Date.now() + maxAge,
      turns: 0,
      busy: false,
      history: [],
      sources: [],
      guest: true,
    });
    res.cookie("cs_copilot", id, {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      maxAge,
      path: "/api",
    });
  }
  logout(req: Request, res: Response) {
    this.checkOrigin(req);
    const s = this.get(req);
    if (s) this.sessions.delete(s.id);
    res.clearCookie("cs_copilot", { path: "/api" });
  }
  authorize = (req: Request, res: Response, next: NextFunction) => {
    try {
      this.checkOrigin(req);
      const s = this.get(req);
      if (!s)
        throw new CopilotError(
          401,
          "Unlock the copilot with the demo access code.",
        );
      res.locals.copilotSession = s;
      next();
    } catch (e) {
      next(e);
    }
  };
}

// Admission reservations persist across restarts. Single-host filesystem lock;
// a multi-instance deployment would need a shared transactional quota store.
export class DailyBudget {
  constructor(
    private filename: string,
    private maxRequests = 60,
  ) {}
  reserve(now = new Date()) {
    const directory = path.dirname(this.filename);
    mkdirSync(directory, { recursive: true });
    let lock: number;
    try {
      lock = openSync(this.filename + ".lock", "wx");
    } catch {
      throw new CopilotError(
        503,
        "Copilot budget is temporarily locked. No API request was made.",
      );
    }
    try {
      const day = now.toISOString().slice(0, 10);
      let prior: { day: string; requests: number } | undefined;
      try {
        prior = JSON.parse(readFileSync(this.filename, "utf8"));
      } catch (e: any) {
        if (e.code !== "ENOENT")
          throw new CopilotError(
            503,
            "Copilot budget state is invalid. Administrator review required.",
          );
      }
      if (
        prior &&
        (typeof prior.day !== "string" ||
          !Number.isInteger(prior.requests) ||
          prior.requests < 0)
      )
        throw new CopilotError(503, "Copilot budget state is invalid.");
      const count = prior?.day === day ? prior.requests : 0;
      if (count >= this.maxRequests)
        throw new CopilotError(
          429,
          "Daily copilot request budget reached. Try after the next UTC day.",
        );
      const state = {
        day,
        requests: count + 1,
        reservedMaxWebCalls: (count + 1) * MAX_WEB_CALLS,
        reservedMaxOutputTokens: (count + 1) * MAX_OUTPUT_TOKENS,
      };
      const temporary = this.filename + ".tmp";
      writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
      renameSync(temporary, this.filename);
    } finally {
      closeSync(lock);
      unlinkSync(this.filename + ".lock");
    }
  }
}
