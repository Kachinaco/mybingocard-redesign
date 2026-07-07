import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

const DB_NAME = "mybingocard";

type EmailPreferenceDocument = {
  email: string;
  marketingEmails?: boolean;
  productUpdates?: boolean;
  unsubscribed?: boolean;
  unsubscribedAt?: Date;
  updatedAt?: Date;
};

type EmailPreferenceResponse = {
  marketingEmails: boolean;
  productUpdates: boolean;
};

type RecordEmailOpenInput = {
  email: string;
  campaignId: string;
  emailId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  openedAt?: Date;
};

type RecordEmailClickInput = {
  email: string;
  campaignId: string;
  url: string;
  linkId?: string | null;
  emailId?: string | null;
  clickedAt?: Date;
};

type RecordEmailSentInput = {
  emailId: string;
  messageId?: string | null;
  email: string;
  campaignId: string;
  subject: string;
  sentAt?: Date;
};

async function mongoDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export async function getEmailPreferences(email: string): Promise<EmailPreferenceResponse> {
  const normalizedEmail = normalizeEmail(email);

  if (useSqliteDb()) {
    const prefs = getSqliteStore().findOne<EmailPreferenceDocument>("email_preferences", { email: normalizedEmail });
    return {
      marketingEmails: prefs?.marketingEmails !== false,
      productUpdates: prefs?.productUpdates !== false,
    };
  }

  const db = await mongoDb();
  const prefs = await db.collection<EmailPreferenceDocument>("email_preferences").findOne({ email: normalizedEmail });
  return {
    marketingEmails: prefs?.marketingEmails !== false,
    productUpdates: prefs?.productUpdates !== false,
  };
}

export async function updateEmailPreferences(input: {
  email: string;
  marketingEmails: boolean;
  productUpdates: boolean;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  const update = {
    $set: {
      email,
      marketingEmails: input.marketingEmails !== false,
      productUpdates: input.productUpdates !== false,
      updatedAt: new Date(),
    },
  };

  if (useSqliteDb()) {
    getSqliteStore().updateOne("email_preferences", { email }, update, { upsert: true });
    return;
  }

  const db = await mongoDb();
  await db.collection("email_preferences").updateOne({ email }, update, { upsert: true });
}

export async function unsubscribeEmail(rawEmail: string): Promise<string> {
  const email = normalizeEmail(rawEmail);
  const update = {
    $set: {
      email,
      unsubscribedAt: new Date(),
      marketingEmails: false,
    },
  };

  if (useSqliteDb()) {
    getSqliteStore().updateOne("email_preferences", { email }, update, { upsert: true });
    return email;
  }

  const db = await mongoDb();
  await db.collection("email_preferences").updateOne({ email }, update, { upsert: true });
  return email;
}

export async function recordEmailOpen(input: RecordEmailOpenInput): Promise<void> {
  const email = normalizeEmail(input.email);
  const openedAt = input.openedAt ?? new Date();
  const update = {
    $set: { lastOpenedAt: openedAt, lastHumanOpenAt: openedAt },
    $inc: { openCount: 1, humanOpenCount: 1 },
    $setOnInsert: {
      email,
      campaignId: input.campaignId,
      firstOpenedAt: openedAt,
      firstHumanOpenAt: openedAt,
    },
  };

  if (useSqliteDb()) {
    const store = getSqliteStore();
    store.updateOne("drip_opens", { email, campaignId: input.campaignId }, update, { upsert: true });
    if (input.emailId) {
      store.updateOne("email_messages", { emailId: input.emailId }, emailMessageOpenUpdate({
        ...input,
        email,
        openedAt,
      }), { upsert: true });
    }
    return;
  }

  const db = await mongoDb();
  await db.collection("drip_opens").updateOne({ email, campaignId: input.campaignId }, update, { upsert: true });
  if (input.emailId) {
    await db.collection("email_messages").updateOne(
      { emailId: input.emailId },
      emailMessageOpenUpdate({ ...input, email, openedAt }),
      { upsert: true }
    );
  }
}

export async function recordEmailClick(input: RecordEmailClickInput): Promise<void> {
  const email = normalizeEmail(input.email);
  const clickedAt = input.clickedAt ?? new Date();
  const update = {
    $set: { lastClickedAt: clickedAt },
    $inc: { clickCount: 1 },
    $setOnInsert: {
      email,
      campaignId: input.campaignId,
      url: input.url,
      linkId: input.linkId || null,
      firstClickedAt: clickedAt,
    },
  };

  if (useSqliteDb()) {
    const store = getSqliteStore();
    store.updateOne("drip_clicks", { email, campaignId: input.campaignId, url: input.url }, update, { upsert: true });
    if (input.emailId) {
      store.updateOne("email_messages", { emailId: input.emailId }, emailMessageClickUpdate({
        ...input,
        email,
        clickedAt,
      }), { upsert: true });
    }
    return;
  }

  const db = await mongoDb();
  await db.collection("drip_clicks").updateOne({ email, campaignId: input.campaignId, url: input.url }, update, { upsert: true });
  if (input.emailId) {
    await db.collection("email_messages").updateOne(
      { emailId: input.emailId },
      emailMessageClickUpdate({ ...input, email, clickedAt }),
      { upsert: true }
    );
  }
}

export async function recordEmailMessageSent(input: RecordEmailSentInput): Promise<void> {
  const sentAt = input.sentAt ?? new Date();
  const update = {
    $set: {
      messageId: input.messageId,
      email: normalizeEmail(input.email),
      campaignId: input.campaignId,
      subject: input.subject,
      sentAt,
      updatedAt: sentAt,
    },
    $setOnInsert: {
      emailId: input.emailId,
      status: "sent",
      openCount: 0,
      humanOpenCount: 0,
      botOpenCount: 0,
      clickCount: 0,
      createdAt: sentAt,
    },
  };

  if (useSqliteDb()) {
    getSqliteStore().updateOne("email_messages", { emailId: input.emailId }, update, { upsert: true });
    return;
  }

  const db = await mongoDb();
  await db.collection("email_messages").updateOne({ emailId: input.emailId }, update, { upsert: true });
}

function emailMessageOpenUpdate(input: RecordEmailOpenInput & { openedAt: Date }) {
  return {
    $set: {
      email: normalizeEmail(input.email),
      campaignId: input.campaignId,
      status: "opened",
      lastOpenedAt: input.openedAt,
      updatedAt: input.openedAt,
      lastOpenIp: input.ip || null,
      lastOpenUserAgent: input.userAgent || null,
      lastOpenWasBot: false,
    },
    $inc: { openCount: 1, humanOpenCount: 1 },
    $setOnInsert: {
      emailId: input.emailId,
      createdAt: input.openedAt,
    },
    $min: {
      firstOpenedAt: input.openedAt,
      firstHumanOpenAt: input.openedAt,
    },
  };
}

function emailMessageClickUpdate(input: RecordEmailClickInput & { clickedAt: Date }) {
  return {
    $set: {
      email: normalizeEmail(input.email),
      campaignId: input.campaignId,
      status: "clicked",
      lastClickedAt: input.clickedAt,
      updatedAt: input.clickedAt,
      lastClickedUrl: input.url,
      lastClickedLinkId: input.linkId || null,
    },
    $inc: { clickCount: 1 },
    $setOnInsert: {
      emailId: input.emailId,
      createdAt: input.clickedAt,
    },
    $min: { firstClickedAt: input.clickedAt },
  };
}
