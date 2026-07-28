import { afterEach, describe, expect, test } from "bun:test";
import { createSign } from "node:crypto";
import {
  verifyAndDecodeAppleTransaction,
} from "@/lib/apple-app-store-verifier";

const SELF_SIGNED_PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIGXpKqbFcJqZFZeJjP5uJZ3gO6i9AnsZqw0h7H1fDA+4oAoGCCqGSM49
AwEHoUQDQgAEhN8nZuRAOH0K+Ft4bsarCQZ/5UuIM8CWQpv3sXpZ8ovAO3bvHaZ+
KYCxAn3oTq+saOVXpKSex0IkaKTNhKlTiw==
-----END EC PRIVATE KEY-----`;
const SELF_SIGNED_CERTIFICATE = "MIIBOTCB4AIJAKYDuXXiE/0LMAoGCCqGSM49BAMCMCUxIzAhBgNVBAMMGk5vdCBBcHBsZSBUZXN0IENlcnRpZmljYXRlMB4XDTI2MDcxMDA1NTMzMloXDTM2MDcwNzA1NTMzMlowJTEjMCEGA1UEAwwaTm90IEFwcGxlIFRlc3QgQ2VydGlmaWNhdGUwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAASE3ydm5EA4fQr4W3huxqsJBn/lS4gzwJZCm/exelnyi8A7du8dpn4pgLECfehOr6xo5VekpJ7HQiRopM2EqVOLMAoGCCqGSM49BAMCA0gAMEUCIAaDrK0elSuAtGC7qx6toRlcOiMVTY+Y3/lf7S/b4cllAiEA1gfmKUm8y6pCuqYv21qrUc9kF2gCrLSzdFSSY/KCck4=";

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function forgedAppleTransaction(): string {
  const header = base64UrlJson({
    alg: "ES256",
    x5c: [
      SELF_SIGNED_CERTIFICATE,
      SELF_SIGNED_CERTIFICATE,
      SELF_SIGNED_CERTIFICATE,
    ],
  });
  const payload = base64UrlJson({
    bundleId: "com.coryanalla.MyBingoCardApp",
    environment: "Sandbox",
    productId: "com.coryanalla.MyBingoCardApp.premium.lifetime",
    transactionId: "forged-lifetime-transaction",
    originalTransactionId: "forged-lifetime-transaction",
    purchaseDate: Date.now(),
    signedDate: Date.now(),
  });
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = signer.sign({
    key: SELF_SIGNED_PRIVATE_KEY,
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${payload}.${signature.toString("base64url")}`;
}

describe("Apple App Store signed-data verification", () => {
  afterEach(() => {
    delete process.env.APPLE_IAP_ENABLE_ONLINE_CHECKS;
  });

  test("rejects a correctly signed transaction whose certificate is not chained to Apple", async () => {
    process.env.APPLE_IAP_ENABLE_ONLINE_CHECKS = "0";
    await expect(verifyAndDecodeAppleTransaction(forgedAppleTransaction())).rejects.toThrow();
  });

  test("does not permit unsigned Xcode or local-testing environments on the server", async () => {
    const header = base64UrlJson({ alg: "none" });
    const payload = base64UrlJson({ environment: "Xcode" });
    await expect(verifyAndDecodeAppleTransaction(`${header}.${payload}.unsigned`)).rejects.toThrow(
      "Unsupported Apple transaction environment",
    );
  });
});
