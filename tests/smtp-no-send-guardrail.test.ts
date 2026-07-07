import { afterEach, describe, expect, test } from "bun:test";
import { sendSmtpMail } from "../lib/smtp";

const ORIGINAL_DISABLED = process.env.MYBINGOCARD_EMAIL_SENDS_DISABLED;
const ORIGINAL_HOST = process.env.EMAIL_SERVER_HOST;
const ORIGINAL_USER = process.env.EMAIL_SERVER_USER;
const ORIGINAL_PASSWORD = process.env.EMAIL_SERVER_PASSWORD;

afterEach(() => {
  restoreEnv("MYBINGOCARD_EMAIL_SENDS_DISABLED", ORIGINAL_DISABLED);
  restoreEnv("EMAIL_SERVER_HOST", ORIGINAL_HOST);
  restoreEnv("EMAIL_SERVER_USER", ORIGINAL_USER);
  restoreEnv("EMAIL_SERVER_PASSWORD", ORIGINAL_PASSWORD);
});

describe("SMTP no-send guardrail", () => {
  test("returns a synthetic message id without requiring SMTP config when disabled", async () => {
    process.env.MYBINGOCARD_EMAIL_SENDS_DISABLED = "1";
    delete process.env.EMAIL_SERVER_HOST;
    delete process.env.EMAIL_SERVER_USER;
    delete process.env.EMAIL_SERVER_PASSWORD;

    const result = await sendSmtpMail({
      from: "support@mybingocard.com",
      to: "cory@example.com",
      subject: "SQLite OAuth smoke",
      html: "<p>no send</p>",
      text: "no send",
    });

    expect(result.messageId).toStartWith("no-send-");
    expect(result.messageId).toEndWith("@mybingocard.local");
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (typeof value === "undefined") {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
