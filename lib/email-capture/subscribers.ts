import type { Collection, Db, UpdateResult } from "mongodb";

export interface EmailSubscriber {
  email: string;
  source: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
  updatedAt: Date;
}

export interface EmailSubscriberCollectionLike {
  updateOne(
    filter: { email: string },
    update: {
      $setOnInsert: {
        email: string;
        source: string;
        subscribedAt: Date;
        unsubscribedAt: null;
      };
      $set: {
        updatedAt: Date;
      };
    },
    options: { upsert: true }
  ): Promise<Pick<UpdateResult, "matchedCount" | "upsertedCount">>;
}

export async function getEmailSubscribersCollection(
  db: Db
): Promise<Collection<EmailSubscriber>> {
  const collection = db.collection<EmailSubscriber>("email_subscribers");
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
}

export async function upsertEmailSubscriber(
  collection: EmailSubscriberCollectionLike,
  rawEmail: string,
  source: string | undefined,
  now = new Date()
): Promise<{ email: string; duplicate: boolean }> {
  const email = rawEmail.toLowerCase().trim();
  const normalizedSource = source?.trim() || "popup";

  const result = await collection.updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        source: normalizedSource,
        subscribedAt: now,
        unsubscribedAt: null,
      },
      $set: {
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return {
    email,
    duplicate: result.upsertedCount === 0 && result.matchedCount > 0,
  };
}
