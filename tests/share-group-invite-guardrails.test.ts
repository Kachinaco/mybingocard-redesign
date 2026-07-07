import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("share group invite guardrails", () => {
  const groupRouteSource = readFileSync(resolve(process.cwd(), "app/b/[code]/route.ts"), "utf8");
  const sharedLinksDbSource = readFileSync(resolve(process.cwd(), "lib/db/sharedLinks.ts"), "utf8");
  const playClientSource = readFileSync(resolve(process.cwd(), "app/play/[linkId]/PlayClient.tsx"), "utf8");
  const shareLinksPageSource = readFileSync(resolve(process.cwd(), "app/dashboard/share-links/page.tsx"), "utf8");
  const copyGroupButtonSource = readFileSync(resolve(process.cwd(), "components/CopyGroupInviteButton.tsx"), "utf8");
  const shareBatchModalSource = readFileSync(resolve(process.cwd(), "components/ShareBatchModal.tsx"), "utf8");
  const shareBatchButtonSource = readFileSync(resolve(process.cwd(), "components/ShareBatchButton.tsx"), "utf8");

  test("one public group invite assigns the next pending player link", () => {
    expect(groupRouteSource).toContain("getShareGroupInviteTarget");
    expect(groupRouteSource).not.toContain("clientPromise");
    expect(sharedLinksDbSource).toContain("getShareGroupInviteTarget");
    expect(sharedLinksDbSource).toContain('status: "pending"');
    expect(sharedLinksDbSource).toContain("sort: { createdAt: 1 }");
    expect(sharedLinksDbSource).toContain(".sort({ createdAt: 1 })");
    expect(groupRouteSource).toContain('targetPath.searchParams.set("autoJoin", "1")');
    expect(groupRouteSource).toContain('targetPath.searchParams.set("group", code)');
    expect(groupRouteSource).toContain('event: "share_group_invite_opened"');
  });

  test("group invites auto-join guest players without making them choose a link", () => {
    expect(playClientSource).toContain('searchParams.get("autoJoin") === "1"');
    expect(playClientSource).toContain('"share_group_auto_join_started"');
    expect(playClientSource).toContain('method: autoJoin ? "group_guest" : "guest"');
    expect(playClientSource).toContain('window.location.href = `/b/${encodeURIComponent(groupCode)}`;');
    expect(playClientSource).toContain("All cards from this group invite have already been taken.");
  });

  test("dashboard exposes a single copyable group invite per share batch", () => {
    expect(shareLinksPageSource).toContain("CopyGroupInviteButton");
    expect(shareLinksPageSource).toContain("Send one group invite. Each friend gets the next unused card automatically.");
    expect(copyGroupButtonSource).toContain("Copy group invite");
    expect(copyGroupButtonSource).toContain("share_group_invite_copied");
    expect(copyGroupButtonSource).toContain("share_group_invite_shared");
    expect(copyGroupButtonSource).toContain("/b/{inviteCode}");
  });

  test("batch sharing is framed as one group invite first", () => {
    expect(shareBatchButtonSource).toContain("Create Group Invite");
    expect(shareBatchModalSource).toContain('useState<RecipientMode>("self")');
    expect(shareBatchModalSource).toContain("Group chat link");
    expect(shareBatchModalSource).toContain("Every player gets the next unused card.");
  });
});
