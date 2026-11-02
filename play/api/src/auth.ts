// Who is asking (play/SPEC.md §1, §7): a passkey is the whole account. Sign-up is open and makes a traveler of Maia
// City; the legacy founders' passkeys were copied in, and as the relying party is maia.city (RP_ID), the same passkey
// signs in here. A session is a signed cookie of play.maia.city alone. Ported from aven/api/src/passkey.ts, session.ts.
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Db } from "./pg";
import { COOP } from "./access";

const env = (k: string, d: string) => (process.env[k] ?? d).trim();
export const RP_ID = () => env("RP_ID", "localhost");
const RP_NAME = () => env("RP_NAME", "maiaCITY play");
const ORIGINS = () => env("SITE_ORIGIN", "http://localhost:5173").split(",").map((o) => o.trim()).filter(Boolean);

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type Human = { id: string; name: string };

// open challenges, short-lived, in memory (one container serves play)
type Challenge = { purpose: "register" | "login"; name?: string; expires: number };
const CHALLENGES = new Map<string, Challenge>();
const MOST_CHALLENGES = 10_000;

function remember(challenge: string, data: Omit<Challenge, "expires">) {
  for (const [c, d] of CHALLENGES) if (d.expires < Date.now()) CHALLENGES.delete(c);
  while (CHALLENGES.size >= MOST_CHALLENGES) CHALLENGES.delete(CHALLENGES.keys().next().value as string);
  CHALLENGES.set(challenge, { ...data, expires: Date.now() + 5 * 60_000 });
}

function take(challenge: string, purpose: Challenge["purpose"]): Challenge | null {
  const d = CHALLENGES.get(challenge);
  if (!d || d.purpose !== purpose || d.expires < Date.now()) return null;
  CHALLENGES.delete(challenge);
  return d;
}

/** the challenge the browser signed, read back out of clientDataJSON */
function challengeOf(body: any): string {
  try {
    return String(JSON.parse(Buffer.from(String(body?.response?.clientDataJSON ?? ""), "base64url").toString("utf8")).challenge ?? "");
  } catch {
    return "";
  }
}

export const cleanName = (name: unknown) => `${name ?? ""}`.trim().replace(/\s+/g, " ").slice(0, 60);

export async function registerOptions(name: string): Promise<Result<unknown>> {
  const clean = cleanName(name);
  if (clean.length < 2) return { ok: false, error: "Please give a name with at least two characters." };
  const options = await generateRegistrationOptions({
    rpName: RP_NAME(),
    rpID: RP_ID(),
    userID: new TextEncoder().encode(randomUUID()),
    userName: clean,
    userDisplayName: clean,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  remember(options.challenge, { purpose: "register", name: clean });
  return { ok: true, value: options };
}

/** a new human, their passkey and their membership as a traveler, in one transaction */
export async function createHuman(db: Db, name: string, passkey?: { id: string; publicKey: string; counter: number; transports?: string | null }): Promise<Human> {
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.query(`INSERT INTO play.humans (id, name) VALUES ($1, $2)`, [id, name]);
    if (passkey)
      await tx.query(`INSERT INTO play.passkeys (id, human_id, public_key, counter, transports) VALUES ($1, $2, $3, $4, $5)`, [
        passkey.id, id, passkey.publicKey, passkey.counter, passkey.transports ?? null,
      ]);
    await tx.query(`INSERT INTO play.memberships (coop_id, human_id, level) VALUES ($1, $2, 'traveler')`, [COOP, id]);
  });
  return { id, name };
}

export async function registerFinish(db: Db, body: any): Promise<Result<Human>> {
  const challenge = challengeOf(body);
  const pending = challenge ? take(challenge, "register") : null;
  if (!pending?.name) return { ok: false, error: "This sign-up has expired. Please start again." };
  let v;
  try {
    v = await verifyRegistrationResponse({ response: body, expectedChallenge: challenge, expectedOrigin: ORIGINS(), expectedRPID: RP_ID(), requireUserVerification: false });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!v.verified || !v.registrationInfo) return { ok: false, error: "The passkey could not be verified." };
  const { credential } = v.registrationInfo;
  const human = await createHuman(db, pending.name, {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports?.join(",") ?? null,
  });
  return { ok: true, value: human };
}

export async function loginOptions() {
  const options = await generateAuthenticationOptions({ rpID: RP_ID(), userVerification: "preferred" });
  remember(options.challenge, { purpose: "login" });
  return options;
}

export async function loginFinish(db: Db, body: any): Promise<Result<Human>> {
  const challenge = challengeOf(body);
  const pending = challenge ? take(challenge, "login") : null;
  if (!pending) return { ok: false, error: "This sign-in has expired. Please try again." };
  const { rows } = await db.query<{ id: string; human_id: string; public_key: string; counter: string; transports: string | null }>(
    `SELECT id, human_id, public_key, counter, transports FROM play.passkeys WHERE id = $1`, [String(body?.id ?? "")],
  );
  const key = rows[0];
  if (!key) return { ok: false, error: "This passkey is not registered here." };
  let v;
  try {
    v = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGINS(),
      expectedRPID: RP_ID(),
      requireUserVerification: false,
      credential: {
        id: key.id,
        publicKey: new Uint8Array(Buffer.from(key.public_key, "base64url")),
        counter: Number(key.counter),
        transports: key.transports ? (key.transports.split(",") as any) : undefined,
      },
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!v.verified) return { ok: false, error: "That passkey did not verify." };
  await db.query(`UPDATE play.passkeys SET counter = $2 WHERE id = $1`, [key.id, v.authenticationInfo.newCounter]);
  const { rows: h } = await db.query<Human>(`SELECT id, name FROM play.humans WHERE id = $1`, [key.human_id]);
  if (!h[0]) return { ok: false, error: "That passkey has no account behind it." };
  // a legacy founder signing in for the first time here is a traveler too
  await db.query(`INSERT INTO play.memberships (coop_id, human_id, level) VALUES ($1, $2, 'traveler') ON CONFLICT DO NOTHING`, [COOP, h[0].id]);
  return { ok: true, value: h[0] };
}

// ------------------------------------------------------------------ sessions

const COOKIE = "play_session";
const LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
let SECRET = "";

/** load (or make) the signing key, kept in play.secrets so sessions survive a restart */
export async function initSessions(db: Db): Promise<void> {
  if (SECRET) return;
  await db.query(`INSERT INTO play.secrets (key, value) VALUES ('session_secret', $1) ON CONFLICT (key) DO NOTHING`, [randomUUID() + randomUUID()]);
  const { rows } = await db.query<{ value: string }>(`SELECT value FROM play.secrets WHERE key = 'session_secret'`);
  SECRET = rows[0].value;
}

const sign = (data: string) => {
  if (!SECRET) throw new Error("initSessions() must run before the first token");
  return createHmac("sha256", SECRET).update(data).digest("base64url");
};

export function tokenFor(humanId: string, now = Date.now()): string {
  const data = `${humanId}.${now + LIFETIME_MS}`;
  return `${data}.${sign(data)}`;
}

function verify(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expiry, signature] = parts;
  if (!(Number(expiry) > Date.now())) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(`${id}.${expiry}`));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

const secure = () => (RP_ID() === "localhost" ? "" : "; Secure");
export const sessionCookie = (token: string) => `${COOKIE}=${token}; Path=/; Max-Age=${LIFETIME_MS / 1000}; SameSite=Lax; HttpOnly${secure()}`;
export const clearCookie = () => `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure()}`;

/** the human a request's session names, or null */
export function humanIdFrom(req: Request): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE) return verify(rest.join("="));
  }
  return null;
}
