import {
  sendBillingFailedEmail,
  sendBillingSuccessEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCanceledEmail,
  sendWelcomeEmail,
} from "../lib/email";

async function main() {
  const to = process.argv[2] || process.env.PREVIEW_TO;
  if (!to) {
    throw new Error("Usage: npx tsx scripts/send-email-previews.ts <email>");
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

  await sendWelcomeEmail(to, "Cory Analla");
  await sendMagicLinkEmail(to, `${baseUrl}/api/auth/callback/nodemailer?token=preview-token&email=${encodeURIComponent(to)}`);
  await sendPasswordResetEmail(to, "Cory Analla", `${baseUrl}/reset-password?token=preview-reset-token`);
  await sendSubscriptionActivatedEmail(to, "Cory Analla", "Pro");
  await sendBillingSuccessEmail(to, "Cory Analla", 999, "USD", new Date(Date.now() + 1000 * 60 * 60 * 24 * 30));
  await sendBillingFailedEmail(to, "Cory Analla", 999, "USD", `${baseUrl}/settings`);
  await sendSubscriptionCanceledEmail(to, "Cory Analla", new Date(Date.now() + 1000 * 60 * 60 * 24 * 14));

  console.log(`Preview emails sent to ${to}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
