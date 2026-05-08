import crypto from "crypto";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
const DEFAULT_APPLE_AUDIENCE = "com.coryanalla.MyBingoCardApp";

type AppleJwtHeader = {
  alg?: string;
  kid?: string;
};

export type AppleIdentityPayload = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  sub?: string;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
};

type AppleJwk = JsonWebKey & {
  kid?: string;
  alg?: string;
};

let keyCache: { keys: AppleJwk[]; expiresAt: number } | null = null;

function base64urlToBuffer(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function parseJwtSegment<T>(segment: string): T {
  return JSON.parse(base64urlToBuffer(segment).toString("utf8")) as T;
}

async function getAppleKeys(): Promise<AppleJwk[]> {
  if (keyCache && keyCache.expiresAt > Date.now()) {
    return keyCache.keys;
  }

  const response = await fetch(APPLE_KEYS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Apple JWKS request failed: ${response.status}`);
  }

  const body = (await response.json()) as { keys?: AppleJwk[] };
  const keys = body.keys || [];
  keyCache = { keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return keys;
}

export function hashAppleNonce(rawNonce: string): string {
  return crypto.createHash("sha256").update(rawNonce).digest("hex");
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  rawNonce: string,
  expectedAudience = process.env.NATIVE_APPLE_AUDIENCE || DEFAULT_APPLE_AUDIENCE
): Promise<Required<Pick<AppleIdentityPayload, "sub">> & AppleIdentityPayload> {
  const parts = identityToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid Apple identity token format.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = parseJwtSegment<AppleJwtHeader>(encodedHeader);
  const payload = parseJwtSegment<AppleIdentityPayload>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Invalid Apple identity token header.");
  }

  const keys = await getAppleKeys();
  const jwk = keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) {
    keyCache = null;
    throw new Error("Apple identity token key was not found.");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const verified = verifier.verify(publicKey, base64urlToBuffer(encodedSignature));
  if (!verified) {
    throw new Error("Apple identity token signature verification failed.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== APPLE_ISSUER) {
    throw new Error("Apple identity token issuer is invalid.");
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(expectedAudience)) {
    throw new Error("Apple identity token audience is invalid.");
  }

  if (!payload.exp || payload.exp <= now) {
    throw new Error("Apple identity token is expired.");
  }

  if (!payload.sub) {
    throw new Error("Apple identity token does not include a subject.");
  }

  const expectedNonce = hashAppleNonce(rawNonce);
  if (payload.nonce !== expectedNonce) {
    throw new Error("Apple identity token nonce is invalid.");
  }

  return payload as Required<Pick<AppleIdentityPayload, "sub">> & AppleIdentityPayload;
}
