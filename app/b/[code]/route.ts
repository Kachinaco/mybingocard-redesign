import { NextRequest, NextResponse } from "next/server";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { getShareGroupInviteTarget } from "@/lib/db/sharedLinks";

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://mybingocard.com"
).replace(/\/$/, "");

const LINK_ID_PATTERN = /^[a-zA-Z0-9]{6,32}$/;

function redirectNoStore(path: string) {
  const response = NextResponse.redirect(new URL(path, APP_URL));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || typeof code !== "string" || !LINK_ID_PATTERN.test(code)) {
    return redirectNoStore("/");
  }

  try {
    const target = await getShareGroupInviteTarget(code);
    if (!target) {
      return redirectNoStore("/");
    }

    const requestContext = getRequestActivityContext(request);
    trackActivity({
      event: "share_group_invite_opened",
      source: "server",
      userId: null,
      email: null,
      pathname: `/b/${code}`,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        inviteCode: code,
        batchId: target.seed.batchId,
        ownerUserId: target.seed.ownerUserId,
        assignedLinkId: target.pending?.linkId || null,
        available: Boolean(target.pending),
      },
    }).catch(() => {});

    const targetLinkId = target.pending?.linkId || target.seed.linkId;
    const targetPath = new URL(`/play/${targetLinkId}`, APP_URL);
    targetPath.searchParams.set("group", code);

    if (target.pending) {
      targetPath.searchParams.set("autoJoin", "1");
    } else {
      targetPath.searchParams.set("groupFull", "1");
    }

    const response = NextResponse.redirect(targetPath);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("Group invite redirect error:", error);
    return redirectNoStore("/");
  }
}
