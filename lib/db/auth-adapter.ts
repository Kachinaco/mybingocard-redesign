import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";
import type { SqliteDocumentStore } from "@/lib/sqlite-document-store";

type AuthDocument = Record<string, unknown>;

export function createMyBingoCardAuthAdapter(): Adapter {
  return useSqliteDb() ? createSqliteAuthAdapter() : MongoDBAdapter(clientPromise);
}

export function createSqliteAuthAdapter(storeOverride?: SqliteDocumentStore): Adapter {
  const store = () => storeOverride ?? getSqliteStore();

  return {
    async createUser(user) {
      const document = toAuthDocument(user);
      store().insertOne("users", document);
      return fromAuthDocument<AdapterUser>(document);
    },

    async getUser(id) {
      return fromOptionalAuthDocument<AdapterUser>(
        store().findOne<AuthDocument>("users", { _id: objectIdFor(id) })
      );
    },

    async getUserByEmail(email) {
      return fromOptionalAuthDocument<AdapterUser>(
        store().findOne<AuthDocument>("users", { email })
      );
    },

    async getUserByAccount(providerAccountId) {
      const account = store().findOne<AuthDocument>("accounts", providerAccountId);
      if (!account?.userId) return null;

      return fromOptionalAuthDocument<AdapterUser>(
        store().findOne<AuthDocument>("users", { _id: account.userId })
      );
    },

    async updateUser(user) {
      const { _id, ...updates } = toAuthDocument(user);
      const updated = store().findOneAndUpdate<AuthDocument>(
        "users",
        { _id },
        { $set: updates, $currentDate: { updatedAt: true } },
        { returnDocument: "after" }
      );

      if (!updated) throw new Error(`Unable to update missing auth user ${user.id}`);
      return fromAuthDocument<AdapterUser>(updated);
    },

    async deleteUser(userId) {
      const userObjectId = objectIdFor(userId);
      const user = store().findOne<AuthDocument>("users", { _id: userObjectId });

      store().deleteMany("accounts", { userId: userObjectId });
      store().deleteMany("sessions", { userId: userObjectId });
      store().deleteOne("users", { _id: userObjectId });

      return fromOptionalAuthDocument<AdapterUser>(user);
    },

    async linkAccount(account) {
      const document = toAuthDocument(account);
      store().insertOne("accounts", document);
      return fromAuthDocument<AdapterAccount>(document);
    },

    async unlinkAccount(providerAccountId) {
      const account = store().findOne<AuthDocument>("accounts", providerAccountId);
      if (!account) return undefined;

      store().deleteOne("accounts", providerAccountId);
      return fromAuthDocument<AdapterAccount>(account);
    },

    async getAccount(providerAccountId, provider) {
      return fromOptionalAuthDocument<AdapterAccount>(
        store().findOne<AuthDocument>("accounts", { provider, providerAccountId })
      );
    },

    async createSession(session) {
      const document = toAuthDocument(session);
      store().insertOne("sessions", document);
      return fromAuthDocument<AdapterSession>(document);
    },

    async getSessionAndUser(sessionToken) {
      const session = store().findOne<AuthDocument>("sessions", { sessionToken });
      if (!session?.userId) return null;

      const user = store().findOne<AuthDocument>("users", { _id: session.userId });
      if (!user) return null;

      return {
        session: fromAuthDocument<AdapterSession>(session),
        user: fromAuthDocument<AdapterUser>(user),
      };
    },

    async updateSession(session) {
      const { _id, ...updates } = toAuthDocument(session);
      const updated = store().findOneAndUpdate<AuthDocument>(
        "sessions",
        { sessionToken: session.sessionToken },
        { $set: updates },
        { returnDocument: "after" }
      );

      return fromOptionalAuthDocument<AdapterSession>(updated);
    },

    async deleteSession(sessionToken) {
      const session = store().findOne<AuthDocument>("sessions", { sessionToken });
      if (!session) return null;

      store().deleteOne("sessions", { sessionToken });
      return fromAuthDocument<AdapterSession>(session);
    },

    async createVerificationToken(verificationToken) {
      const document = toAuthDocument(verificationToken);
      store().insertOne("verification_tokens", document);
      return verificationToken;
    },

    async useVerificationToken(identifierToken) {
      const token = store().findOne<AuthDocument>("verification_tokens", identifierToken);
      if (!token) return null;

      store().deleteOne("verification_tokens", identifierToken);
      return withoutAdapterId(fromAuthDocument<VerificationToken & { id?: string }>(token));
    },
  };
}

function fromOptionalAuthDocument<T>(document: AuthDocument | null | undefined) {
  return document ? fromAuthDocument<T>(document) : null;
}

function fromAuthDocument<T>(document: object): T {
  const output: AuthDocument = {};

  for (const [key, value] of Object.entries(document)) {
    if (key === "_id") {
      output.id = objectIdString(value);
    } else if (key === "userId") {
      output.userId = objectIdString(value);
    } else {
      output[key] = value;
    }
  }

  return output as T;
}

function toAuthDocument(document: object): AuthDocument {
  const input = document as AuthDocument;
  const output: AuthDocument = {
    _id: objectIdFor(typeof input.id === "string" ? input.id : undefined),
  };

  for (const [key, value] of Object.entries(input)) {
    if (key === "id") continue;
    if (key === "userId") {
      output.userId = objectIdFor(typeof value === "string" ? value : objectIdString(value));
    } else {
      output[key] = value;
    }
  }

  return output;
}

function withoutAdapterId<T extends { id?: unknown }>(document: T): Omit<T, "id"> {
  const { id: _id, ...rest } = document;
  return rest;
}

function objectIdFor(value: string | undefined | null): ObjectId {
  if (!value || value.length !== 24) return new ObjectId();

  try {
    return new ObjectId(value);
  } catch {
    return new ObjectId();
  }
}

function objectIdString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  if (typeof value === "object" && value !== null && "toHexString" in value) {
    return String((value as { toHexString: () => string }).toHexString());
  }
  return String(value);
}
