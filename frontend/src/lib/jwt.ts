import { createHmac, createPrivateKey, sign, type JsonWebKey } from "node:crypto";

const b64 = (v: Buffer | string) => Buffer.from(v).toString("base64url");

/** The key we sign user sessions with: Supabase's ES256 signing key (a private JWK), else the legacy HS256 secret. */
export type SigningKey = { jwk: JsonWebKey & { kid?: string } } | { secret: string };

export function signingKeyFromEnv(env: Record<string, string | undefined> = process.env): SigningKey | null {
  if (env.SUPABASE_JWT_SIGNING_KEY) return { jwk: JSON.parse(env.SUPABASE_JWT_SIGNING_KEY) };
  if (env.SUPABASE_JWT_SECRET) return { secret: env.SUPABASE_JWT_SECRET };
  return null;
}

/** A compact JWS over `claims`: ES256 for a JWK, HS256 for a shared secret. */
export function signJwt(claims: Record<string, unknown>, key: SigningKey): string {
  const header = "jwk" in key ? { alg: "ES256", typ: "JWT", ...(key.jwk.kid ? { kid: key.jwk.kid } : {}) } : { alg: "HS256", typ: "JWT" };
  const input = `${b64(JSON.stringify(header))}.${b64(JSON.stringify(claims))}`;
  const sig =
    "jwk" in key
      ? sign("sha256", Buffer.from(input), { key: createPrivateKey({ key: key.jwk, format: "jwk" }), dsaEncoding: "ieee-p1363" })
      : createHmac("sha256", key.secret).update(input).digest();
  return `${input}.${b64(sig)}`;
}

/** Claims for an authenticated Supabase user session, as GoTrue would issue them. */
export function sessionClaims(supabaseUrl: string, userId: string, email: string, ttlSeconds: number, now = Math.floor(Date.now() / 1000)) {
  return { iss: `${supabaseUrl}/auth/v1`, sub: userId, aud: "authenticated", role: "authenticated", email, iat: now, exp: now + ttlSeconds };
}
