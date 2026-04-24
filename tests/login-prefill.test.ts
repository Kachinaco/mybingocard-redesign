import { describe, expect, test } from "bun:test";
import { getInitialLoginEmails } from "@/lib/auth/login-prefill";

describe("getInitialLoginEmails", () => {
  test("prefills credentials and magic-link email from verified email query param", () => {
    const params = new URLSearchParams({
      verified: "1",
      email: "newuser@example.com",
      callbackUrl: "/create",
    });

    expect(getInitialLoginEmails(params)).toEqual({
      email: "newuser@example.com",
      magicLinkEmail: "newuser@example.com",
    });
  });

  test("ignores invalid email query param", () => {
    const params = new URLSearchParams({ email: "not-an-email" });

    expect(getInitialLoginEmails(params)).toEqual({
      email: "",
      magicLinkEmail: "",
    });
  });
});
