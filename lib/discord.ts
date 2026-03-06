import { getSignupSourceLabel, type AttributionData } from "./attribution";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendDiscordNotification(content: string, embeds?: any[]) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(content ? { content } : {}),
        ...(embeds ? { embeds } : {}),
      }),
    });
  } catch (err) {
    console.error("Discord webhook failed:", err);
  }
}

export async function notifySignup(
  name: string,
  email: string,
  attribution?: Partial<AttributionData>
) {
  const source = getSignupSourceLabel(attribution);

  await sendDiscordNotification("", [{
    title: "🎉 New Signup on MyBingoCard!",
    color: 0x6366f1,
    fields: [
      { name: "Name", value: name, inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Source", value: source, inline: true },
      ...(attribution?.referrer ? [{ name: "Referrer", value: attribution.referrer, inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifySupportEmail(from: string, subject: string, preview: string) {
  await sendDiscordNotification("", [{
    title: "📧 Support Email Received",
    color: 0xf59e0b,
    fields: [
      { name: "From", value: from, inline: true },
      { name: "Subject", value: subject || "(no subject)", inline: true },
      { name: "Preview", value: preview?.substring(0, 200) || "(empty)", inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]);
}
