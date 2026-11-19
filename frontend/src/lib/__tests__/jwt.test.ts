import { createPublicKey, generateKeyPairSync, createHmac, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sessionClaims, signJwt, signingKeyFromEnv } from "../jwt";

const parts = (t: string) => t.split(".");
const json = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString());

describe("signJwt", () => {
  const claims = sessionClaims("http://db.test", "u1", "a@b.c", 3600, 1000);

  it("signs ES256 with the JWK's kid, verifiable with its public key", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = { ...privateKey.export({ format: "jwk" }), kid: "k1" };
    const [h, p, s] = parts(signJwt(claims, { jwk }));
    expect(json(h)).toEqual({ alg: "ES256", typ: "JWT", kid: "k1" });
    expect(json(p)).toMatchObject({ sub: "u1", role: "authenticated", aud: "authenticated", iss: "http://db.test/auth/v1", exp: 4600 });
    const ok = verify("sha256", Buffer.from(`${h}.${p}`), { key: createPublicKey(privateKey), dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
  });

  it("signs HS256 with a shared secret", () => {
    const [h, p, s] = parts(signJwt(claims, { secret: "shh" }));
    expect(json(h).alg).toBe("HS256");
    expect(s).toBe(createHmac("sha256", "shh").update(`${h}.${p}`).digest("base64url"));
  });

  it("prefers the signing key over the legacy secret", () => {
    expect(signingKeyFromEnv({ SUPABASE_JWT_SECRET: "s" })).toEqual({ secret: "s" });
    expect(signingKeyFromEnv({ SUPABASE_JWT_SECRET: "s", SUPABASE_JWT_SIGNING_KEY: '{"kty":"EC"}' })).toEqual({ jwk: { kty: "EC" } });
    expect(signingKeyFromEnv({})).toBeNull();
  });
});
