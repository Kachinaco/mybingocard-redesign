import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dripCampaignsSource = readFileSync(
  join(process.cwd(), "scripts/drip-campaigns.cjs"),
  "utf8"
);

describe("drip campaign email guardrails", () => {
  test("uses verification reminders instead of marketing drips for unverified accounts", () => {
    expect(dripCampaignsSource).toContain("const VERIFICATION_REMINDERS = [");
    expect(dripCampaignsSource).toContain("verify_email_24h");
    expect(dripCampaignsSource).toContain("verify_email_72h");
    expect(dripCampaignsSource).toContain("async function sendVerificationReminder");
    expect(dripCampaignsSource).toContain("if (!isVerifiedUser(user)) {");
    expect(dripCampaignsSource).toMatch(
      /if \(!isVerifiedUser\(user\)\) \{[\s\S]*VERIFICATION_REMINDERS[\s\S]*sendVerificationReminder[\s\S]*continue;/
    );
  });

  test("skips internal and guest accounts before campaign eligibility checks", () => {
    expect(dripCampaignsSource).toContain("function isInternalOrGuestUser(user)");
    expect(dripCampaignsSource).toContain("customerType === 'admin'");
    expect(dripCampaignsSource).toContain("customerType === 'test'");
    expect(dripCampaignsSource).toContain("customerType === 'guest'");
    expect(dripCampaignsSource).toContain("email.includes('@guest.mybingocard.local')");
    expect(dripCampaignsSource).toContain("email.startsWith('guest-')");
    expect(dripCampaignsSource).toMatch(
      /if \(isInternalOrGuestUser\(user\)\) \{[\s\S]*skippedCount\+\+;[\s\S]*continue;/
    );
  });

  test("only completed campaign sends block future retries", () => {
    expect(dripCampaignsSource).toMatch(
      /findOne\(\{\s*userId: user\._id,\s*campaignId: campaign\.id,\s*status: 'sent',\s*\}\)/
    );
    expect(dripCampaignsSource).toContain(
      "Record failure without completing the campaign; a later run can retry it."
    );
    expect(dripCampaignsSource).toContain("db.collection('drip_log').updateOne(");
    expect(dripCampaignsSource).not.toContain("Log the failure so we don't retry");
  });
});
