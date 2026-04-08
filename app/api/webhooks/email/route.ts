import { NextResponse } from "next/server";
import { notifySupportEmail } from "@/lib/discord";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-webhook-secret");
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
