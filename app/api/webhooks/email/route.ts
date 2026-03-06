import { NextResponse } from "next/server";
import { notifySupportEmail } from "@/lib/discord";

// Webhook endpoint for inbound email notifications
// Can be called by email forwarding services (SendGrid, Mailgun, etc.)
// or by a simple cron/IMAP checker
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, subject, text, html } = body;
    
    const preview = text || (html ? html.replace(/<[^>]*>/g, "").substring(0, 200) : "");
    
    await notifySupportEmail(from || "unknown", subject || "(no subject)", preview);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Email webhook error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
