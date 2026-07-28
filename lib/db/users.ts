import { ObjectId } from "bson";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { PlanType } from "@/lib/stripe/config";
import { getSqliteStore } from "@/lib/db/sqlite";

export interface User {
  _id: ObjectId;
  email: string;
  name?: string;
  image?: string;
  password?: string;
  emailVerified?: Date;
  planType: PlanType;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  subscriptionStatus?: "active" | "trialing" | "inactive" | "past_due" | "canceled" | "lifetime";
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: Date | null;
  trialEndsAt?: Date | null;
  purchaseProvider?: "stripe" | "apple";
  appleProductId?: string | null;
  appleTransactionId?: string | null;
  appleOriginalTransactionId?: string | null;
  appleEnvironment?: string | null;
  appleAppAccountToken?: string | null;
  billingPastDueSince?: Date | null;
  billingLastPaymentFailedAt?: Date | null;
  billingNextPaymentAttempt?: Date | null;
  billingFailedAttemptCount?: number | null;
  billingLastInvoiceId?: string | null;
  billingRecoveredAt?: Date | null;
  referralCode?: string;
  createdAt: Date;
  updatedAt: Date;
  // UTM / referral tracking
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  last_utm_source?: string;
  last_utm_medium?: string;
  last_utm_campaign?: string;
  last_utm_content?: string;
  last_utm_term?: string;
  last_referrer?: string;
  anonymousId?: string;
  signupMethod?: "google" | "apple" | "credentials" | "magic_link" | "share_link";
  signupDevice?: string;   // "Chrome 146 / Windows" parsed from UA
  signupCountry?: string;  // "PH" from IP geolocation
  signupLanguage?: string; // "en-PH" from Accept-Language header
  requiresCheckout?: boolean;
  lastSeen?: Date;
  npsShownAt?: Date;
  onboardingDismissed?: boolean;
  onboardingCompleted?: Record<string, boolean>;
  // Behavior counters
  totalCardsCreated?: number;
  lastCardCreatedAt?: Date;
  totalExports?: number;
  lastExportAt?: Date;
  featuresUsed?: string[];
  loginCount?: number;
  lastLoginAt?: Date;
  customerType?: "real" | "admin" | "complimentary" | "test" | "guest";
  guestClaimToken?: string;
  guestClaimTokenExpiresAt?: Date;
}

export type UserAttributionFields = Pick<
  User,
  "utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term" | "referrer"
>;

export interface UserExportRow {
  email?: string;
  name?: string;
  planType?: PlanType;
  subscriptionStatus?: User["subscriptionStatus"];
  signupMethod?: User["signupMethod"];
  createdAt?: Date;
  totalCardsCreated?: number;
  totalExports?: number;
}

export interface AdminUserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  sortBy?: string;
}

export interface AdminUserListItem {
  _id: unknown;
  name: string;
  email: string;
  planType: string;
  subscriptionStatus: string;
  createdAt: unknown;
  lastActive: unknown;
  image?: string;
  cardCount: number;
  trialEndsAt: unknown;
  stripeCustomerId: string | null;
  customerType?: string;
}

export interface AdminUserListResult {
  users: AdminUserListItem[];
  totalUsers: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminActivityEvent {
  _id?: unknown;
  event?: string;
  source?: string;
  metadata?: unknown;
  pathname?: string;
  sessionId?: string;
  anonymousId?: string;
  domain?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface AdminUserDetailResult {
  user: Omit<User, "password">;
  cards: Record<string, unknown>[];
  activityEvents: AdminActivityEvent[];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function idToString(value: unknown) {
  if (
    value
    && typeof value === "object"
    && "toHexString" in value
    && typeof (value as { toHexString?: unknown }).toHexString === "function"
  ) {
    return (value as { toHexString: () => string }).toHexString();
  }
  return String(value ?? "");
}

function toAdminUserListItem(user: Partial<User>, cardCount: number): AdminUserListItem {
  return {
    _id: user._id,
    name: user.name || "No name",
    email: user.email || "",
    planType: user.planType || "FREE",
    subscriptionStatus: user.subscriptionStatus || "inactive",
    createdAt: user.createdAt,
    lastActive: user.updatedAt,
    image: user.image,
    cardCount,
    trialEndsAt: user.trialEndsAt || null,
    stripeCustomerId: user.stripeCustomerId || null,
    customerType: user.customerType,
  };
}

function stripUserPassword(user: User): Omit<User, "password"> {
  const next = { ...user };
  delete next.password;
  return next;
}

function projectAdminActivityEvent(event: Record<string, unknown>): AdminActivityEvent {
  return {
    _id: event._id,
    event: event.event as string | undefined,
    source: event.source as string | undefined,
    metadata: event.metadata,
    pathname: event.pathname as string | undefined,
    sessionId: event.sessionId as string | undefined,
    anonymousId: event.anonymousId as string | undefined,
    domain: event.domain as string | undefined,
    ipAddress: event.ipAddress as string | undefined,
    userAgent: event.userAgent as string | undefined,
    createdAt: event.createdAt as Date | undefined,
  };
}

function buildAdminUserFilter(search: string, plan: string): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [];

  if (search) {
    const escapedSearch = escapeRegex(search);
    conditions.push({
      $or: [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ],
    });
  }

  if (plan) {
    switch (plan) {
      case "premium":
        conditions.push({ planType: "PREMIUM", subscriptionStatus: "active" });
        break;
      case "free":
        conditions.push({
          $or: [{ planType: { $exists: false } }, { planType: "FREE" }, { planType: null }],
        });
        break;
      case "trialing":
        conditions.push({ subscriptionStatus: "trialing" });
        break;
      case "lifetime":
        conditions.push({ planType: "LIFETIME" });
        break;
      case "past_due":
        conditions.push({ subscriptionStatus: "past_due" });
        break;
      case "canceled":
        conditions.push({ subscriptionStatus: "canceled" });
        break;
    }
  }

  if (conditions.length > 1) return { $and: conditions };
  if (conditions.length === 1) return conditions[0] as Record<string, unknown>;
  return {};
}

function buildAdminUserSort(sortBy: string): Record<string, 1 | -1> {
  switch (sortBy) {
    case "oldest":
      return { createdAt: 1 };
    case "last_active":
      return { updatedAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

function sqliteCardCountsForUserIds(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, number>();

  const cards = getSqliteStore().findMany<{ userId?: unknown }>(
    "cards",
    { userId: { $in: userIds } }
  );
  const counts = new Map<string, number>();

  for (const card of cards) {
    const userId = idToString(card.userId);
    counts.set(userId, (counts.get(userId) || 0) + 1);
  }

  return counts;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return getSqliteStore().findOne<User>("users", { email });
}

export async function getUserById(id: string): Promise<User | null> {
  return getSqliteStore().findOne<User>("users", { _id: new ObjectId(id) });
}

export async function getUserByAppleAppAccountToken(token: string): Promise<User | null> {
  return getSqliteStore().findOne<User>("users", { appleAppAccountToken: token });
}

export async function getUserByAppleTransactionIdentity(input: {
  transactionId?: string | null;
  originalTransactionId?: string | null;
}): Promise<User | null> {
  const store = getSqliteStore();
  if (input.transactionId) {
    const exact = store.findOne<User>("users", { appleTransactionId: input.transactionId });
    if (exact) return exact;
  }
  if (input.originalTransactionId) {
    return store.findOne<User>("users", {
      appleOriginalTransactionId: input.originalTransactionId,
    });
  }
  return null;
}

export async function getOrCreateAppleAppAccountToken(userId: string): Promise<string> {
  const existing = await getUserById(userId);
  if (!existing) throw new Error("User not found");
  if (existing.appleAppAccountToken) return existing.appleAppAccountToken;

  const token = crypto.randomUUID();
  getSqliteStore().updateOne<User>(
    "users",
    {
      _id: new ObjectId(userId),
      $or: [
        { appleAppAccountToken: { $exists: false } },
        { appleAppAccountToken: null },
        { appleAppAccountToken: "" },
      ],
    },
    { $set: { appleAppAccountToken: token, updatedAt: new Date() } },
  );

  const persisted = await getUserById(userId);
  if (!persisted?.appleAppAccountToken) {
    throw new Error("Could not persist Apple account token");
  }
  return persisted.appleAppAccountToken;
}

export async function getUsersForExport(): Promise<UserExportRow[]> {
  return getSqliteStore()
    .findMany<User>("users", {}, { sort: { createdAt: -1 } })
    .map(toUserExportRow);
}

export async function getAdminUsersPage(options: AdminUserListOptions = {}): Promise<AdminUserListResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(200, options.limit || 50));
  const skip = (page - 1) * limit;
  const search = options.search || "";
  const plan = options.plan || "";
  const sortBy = options.sortBy || "newest";
  const filter = buildAdminUserFilter(search, plan);

  const store = getSqliteStore();

  if (sortBy === "most_cards") {
    const allUsers = store.findMany<User>("users", filter);
    const allUserIds = allUsers.map((user) => idToString(user._id));
    const cardCounts = sqliteCardCountsForUserIds(allUserIds);
    const rows = allUsers
      .map((user) => toAdminUserListItem(user, cardCounts.get(idToString(user._id)) || 0))
      .sort((left, right) => right.cardCount - left.cardCount);

    return {
      users: rows.slice(skip, skip + limit),
      totalUsers: rows.length,
      page,
      limit,
      totalPages: Math.ceil(rows.length / limit),
    };
  }

  const users = store.findMany<User>("users", filter, {
    sort: buildAdminUserSort(sortBy),
    skip,
    limit,
  });
  const totalUsers = store.count("users", filter);
  const userIds = users.map((user) => idToString(user._id));
  const cardCounts = sqliteCardCountsForUserIds(userIds);

  return {
    users: users.map((user) => toAdminUserListItem(user, cardCounts.get(idToString(user._id)) || 0)),
    totalUsers,
    page,
    limit,
    totalPages: Math.ceil(totalUsers / limit),
  };
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetailResult | null> {
  const objectId = new ObjectId(id);
  const store = getSqliteStore();
  const user = store.findOne<User>("users", { _id: objectId });
  if (!user) return null;

  const cards = store.findMany<Record<string, unknown>>(
    "cards",
    { $or: [{ userId: id }, { userId: objectId }] },
    { sort: { createdAt: -1 } }
  );
  const activityFilter: Record<string, unknown>[] = [{ userId: id }];
  if (user.email) activityFilter.push({ email: user.email });
  const activityEvents = store
    .findMany<Record<string, unknown>>(
      "activity_events",
      { $or: activityFilter },
      { sort: { createdAt: -1 }, limit: 100 }
    )
    .map(projectAdminActivityEvent);

  return {
    user: stripUserPassword(user),
    cards,
    activityEvents,
  };
}

export async function extendAdminUserTrialById(
  id: string,
  now = new Date()
): Promise<{ user: User; newTrialEnd: Date } | null> {
  const user = await getUserById(id);
  if (!user) return null;

  const currentTrialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const base = currentTrialEnd && currentTrialEnd > now ? currentTrialEnd : now;
  const newTrialEnd = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);

  await updateUser(id, {
    trialEndsAt: newTrialEnd,
    subscriptionStatus: "trialing",
  });

  return { user, newTrialEnd };
}

export async function markAdminUserCancelAtPeriodEndById(id: string): Promise<User | null> {
  const user = await getUserById(id);
  if (!user) return null;

  await updateUser(id, { cancelAtPeriodEnd: true });
  return user;
}

function toUserExportRow(user: Partial<User>): UserExportRow {
  return {
    email: user.email || "",
    name: user.name || "",
    planType: user.planType || "FREE",
    subscriptionStatus: user.subscriptionStatus || "inactive",
    signupMethod: user.signupMethod,
    createdAt: user.createdAt,
    totalCardsCreated: user.totalCardsCreated,
    totalExports: user.totalExports,
  };
}

export async function createUser(data: {
  email: string;
  password?: string;
  name?: string;
  image?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  last_utm_source?: string;
  last_utm_medium?: string;
  last_utm_campaign?: string;
  last_utm_content?: string;
  last_utm_term?: string;
  last_referrer?: string;
  signupMethod?: "google" | "apple" | "credentials" | "magic_link";
  signupDevice?: string;
  signupLanguage?: string;
}): Promise<User> {
  const hashedPassword = data.password
    ? await bcrypt.hash(data.password, 10)
    : undefined;

  const user: Partial<User> = {
    email: data.email,
    name: data.name,
    image: data.image,
    password: hashedPassword,
    planType: "FREE",
    subscriptionStatus: "inactive",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...(data.utm_source && { utm_source: data.utm_source }),
    ...(data.utm_medium && { utm_medium: data.utm_medium }),
    ...(data.utm_campaign && { utm_campaign: data.utm_campaign }),
    ...(data.utm_content && { utm_content: data.utm_content }),
    ...(data.utm_term && { utm_term: data.utm_term }),
    ...(data.referrer && { referrer: data.referrer }),
    ...(data.last_utm_source && { last_utm_source: data.last_utm_source }),
    ...(data.last_utm_medium && { last_utm_medium: data.last_utm_medium }),
    ...(data.last_utm_campaign && { last_utm_campaign: data.last_utm_campaign }),
    ...(data.last_utm_content && { last_utm_content: data.last_utm_content }),
    ...(data.last_utm_term && { last_utm_term: data.last_utm_term }),
    ...(data.last_referrer && { last_referrer: data.last_referrer }),
    ...(data.signupMethod && { signupMethod: data.signupMethod }),
    ...(data.signupDevice && { signupDevice: data.signupDevice }),
    ...(data.signupLanguage && { signupLanguage: data.signupLanguage }),
    referralCode: crypto.randomBytes(4).toString("hex"),
  };

  const result = getSqliteStore().insertOne("users", user as User);

  return {
    ...user,
    _id: result.insertedId as ObjectId,
  } as User;
}

export async function createGuestShareLinkUser(data: {
  _id: ObjectId;
  email: string;
  guestClaimToken: string;
  guestClaimTokenExpiresAt: Date;
  now?: Date;
}): Promise<User> {
  const now = data.now || new Date();
  const guestUser: User = {
    _id: data._id,
    email: data.email,
    name: "Guest Player",
    planType: "FREE",
    subscriptionStatus: "inactive",
    customerType: "guest",
    signupMethod: "share_link",
    createdAt: now,
    updatedAt: now,
    guestClaimToken: data.guestClaimToken,
    guestClaimTokenExpiresAt: data.guestClaimTokenExpiresAt,
  };

  getSqliteStore().insertOne("users", guestUser);
  return guestUser;
}

export async function getActiveGuestClaimUser(
  userId: string,
  now = new Date()
): Promise<User | null> {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(userId);
  } catch {
    return null;
  }

  const filter: any = {
    _id: objectId,
    customerType: "guest",
    guestClaimToken: { $exists: true, $ne: null },
    guestClaimTokenExpiresAt: { $gt: now },
  };

  return getSqliteStore().findOne<User>("users", filter);
}

function buildMissingAttributionUpdates(
  current: Partial<UserAttributionFields>,
  incoming: Partial<UserAttributionFields>
): Partial<UserAttributionFields> {
  const updates: Partial<UserAttributionFields> = {};

  if (incoming.utm_source && !current.utm_source) updates.utm_source = incoming.utm_source;
  if (incoming.utm_medium && !current.utm_medium) updates.utm_medium = incoming.utm_medium;
  if (incoming.utm_campaign && !current.utm_campaign) updates.utm_campaign = incoming.utm_campaign;
  if (incoming.utm_content && !current.utm_content) updates.utm_content = incoming.utm_content;
  if (incoming.utm_term && !current.utm_term) updates.utm_term = incoming.utm_term;
  if (incoming.referrer && !current.referrer) updates.referrer = incoming.referrer;

  return updates;
}

export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<User | null> {
  return getSqliteStore().findOneAndUpdate<User>(
    "users",
    { _id: new ObjectId(id) },
    {
      $set: {
        ...data,
        updatedAt: new Date()
      }
    },
    { returnDocument: "after" }
  );
}

export async function markUserEmailVerified(
  id: string,
  verifiedAt = new Date()
): Promise<User> {
  const objectId = new ObjectId(id);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = getSqliteStore().findOne<User>("users", { _id: objectId });
    if (!existing) throw new Error("User not found");
    if (existing.emailVerified) return existing;

    const updated = getSqliteStore().findOneAndUpdateAtomic<User>(
      "users",
      {
        _id: objectId,
        $or: [
          { emailVerified: { $exists: false } },
          { emailVerified: null },
        ],
      },
      {
        $set: {
          emailVerified: verifiedAt,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    if (updated?.emailVerified) return updated;
  }

  const persisted = await getUserById(id);
  if (!persisted?.emailVerified) {
    throw new Error("Could not persist email verification");
  }
  return persisted;
}

export async function recordNativeOAuthLogin(
  user: User,
  data: {
    signupMethod: NonNullable<User["signupMethod"]>;
    name?: string;
    now?: Date;
  }
): Promise<User | null> {
  const now = data.now || new Date();
  const updates: Partial<User> = {
    emailVerified: user.emailVerified || now,
    lastLoginAt: now,
    updatedAt: now,
    signupMethod: user.signupMethod || data.signupMethod,
  };

  if (data.name && !user.name) {
    updates.name = data.name;
  }

  const update = {
    $set: updates,
    $inc: { loginCount: 1 },
  };

  return getSqliteStore().findOneAndUpdate<User>(
    "users",
    { _id: user._id },
    update,
    { returnDocument: "after" }
  );
}

export async function deleteUserAccountData(user: Pick<User, "_id" | "email">): Promise<void> {
  const userId = user._id.toString();
  const userOid = new ObjectId(userId);
  const accountUserFilter = { $or: [{ userId: userOid }, { userId }] };

  const store = getSqliteStore();
  store.deleteMany("cards", { userId });
  store.deleteMany("gameHistory", { userId });
  store.deleteMany("game_states", { userId });
  store.deleteMany("favorites", { userId });
  store.deleteMany("batch_purchases", { $or: [{ userId }, { email: user.email }] });
  store.deleteMany("accounts", accountUserFilter);
  store.deleteMany("sessions", accountUserFilter);
  store.deleteOne("email_preferences", { email: user.email });
  store.deleteMany("drip_opens", { email: user.email });
  store.deleteMany("drip_log", { userId });
  store.deleteOne("users", { _id: userOid });
}

export async function updateUserLastSeenByEmail(email: string, lastSeen = new Date()): Promise<void> {
  await updateUserFieldsByEmail(email, { lastSeen });
}

export async function markUserNpsShownByEmail(email: string, npsShownAt = new Date()): Promise<void> {
  await updateUserFieldsByEmail(email, { npsShownAt });
}

export async function setUserOnboardingDismissedByEmail(
  email: string,
  dismissed = true
): Promise<void> {
  await updateUserFieldsByEmail(email, { onboardingDismissed: dismissed });
}

export async function markUserOnboardingStepCompletedByEmail(
  email: string,
  step: string
): Promise<void> {
  await updateUserFieldsByEmail(email, { [`onboardingCompleted.${step}`]: true });
}

async function updateUserFieldsByEmail(
  email: string,
  fields: Record<string, unknown>
): Promise<void> {
  if (Object.keys(fields).length === 0) return;

  getSqliteStore().updateOne<User>("users", { email }, { $set: fields });
}

export async function updateMissingUserSignupContext(
  id: string,
  data: {
    signupDevice?: string;
    signupLanguage?: string;
  }
): Promise<void> {
  const desired: Record<string, string> = {};
  if (data.signupDevice) desired.signupDevice = data.signupDevice;
  if (data.signupLanguage) desired.signupLanguage = data.signupLanguage;

  if (Object.keys(desired).length === 0) return;

  const objectId = new ObjectId(id);
  const user = getSqliteStore().findOne<User>("users", { _id: objectId });
  if (!user) return;

  const updates: Record<string, string> = {};
  if (desired.signupDevice && !user.signupDevice) updates.signupDevice = desired.signupDevice;
  if (desired.signupLanguage && !user.signupLanguage) updates.signupLanguage = desired.signupLanguage;

  if (Object.keys(updates).length === 0) return;

  getSqliteStore().updateOne<User>(
    "users",
    { _id: objectId },
    { $set: updates }
  );
}

export async function updateUserAttribution(
  id: string,
  data: Partial<UserAttributionFields>
): Promise<User | null> {
  const current = await getUserById(id);
  if (!current) return null;

  const updates = buildMissingAttributionUpdates(current, data);
  if (Object.keys(updates).length === 0) {
    return current;
  }

  return updateUser(id, updates);
}

export async function updateUserLastAttribution(
  id: string,
  data: Partial<UserAttributionFields>
): Promise<User | null> {
  const updates: Partial<User> = {
    ...(data.utm_source ? { last_utm_source: data.utm_source } : {}),
    ...(data.utm_medium ? { last_utm_medium: data.utm_medium } : {}),
    ...(data.utm_campaign ? { last_utm_campaign: data.utm_campaign } : {}),
    ...(data.utm_content ? { last_utm_content: data.utm_content } : {}),
    ...(data.utm_term ? { last_utm_term: data.utm_term } : {}),
    ...(data.referrer ? { last_referrer: data.referrer } : {}),
  };

  if (Object.keys(updates).length === 0) {
    return getUserById(id);
  }

  return updateUser(id, updates);
}

export async function updateUserSignupMethod(
  id: string,
  signupMethod: NonNullable<User["signupMethod"]>
): Promise<User | null> {
  return updateUser(id, { signupMethod });
}

export async function ensureUserDefaults(id: string): Promise<User | null> {
  const current = await getUserById(id);
  if (!current) return null;

  const now = new Date();
  const updates: Partial<User> = {};

  if (current.createdAt === undefined) {
    updates.createdAt = current._id.getTimestamp();
  }

  if (current.updatedAt === undefined) {
    updates.updatedAt = now;
  }

  if (current.planType === undefined) {
    updates.planType = "FREE";
  }

  if (current.subscriptionStatus === undefined) {
    updates.subscriptionStatus = "inactive";
  }

  if (current.cancelAtPeriodEnd === undefined) {
    updates.cancelAtPeriodEnd = false;
  }

  if (current.emailVerified === undefined || current.emailVerified === null) {
    updates.emailVerified = now;
  }

  if (current.cancelAt === undefined) {
    updates.cancelAt = null;
  }

  if (!(current as any).referralCode) {
    (updates as any).referralCode = crypto.randomBytes(4).toString("hex");
  }

  if (Object.keys(updates).length === 0) {
    return current;
  }

  return updateUser(id, updates);
}




export async function updateUserSubscription(
  email: string,
  subscriptionData: {
    planType?: PlanType;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    status?: "active" | "trialing" | "inactive" | "past_due" | "canceled" | "lifetime";
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
    cancelAt?: Date | null;
    cancellationReason?: string | null;
    cancellationFeedback?: string | null;
    trialEndsAt?: Date | null;
  }
): Promise<User | null> {
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (subscriptionData.planType !== undefined) {
    updateData.planType = subscriptionData.planType;
  }

  if (subscriptionData.stripeCustomerId !== undefined) {
    updateData.stripeCustomerId = subscriptionData.stripeCustomerId;
  }

  if (subscriptionData.stripeSubscriptionId !== undefined) {
    updateData.stripeSubscriptionId = subscriptionData.stripeSubscriptionId;
  }

  if (subscriptionData.stripePriceId !== undefined) {
    updateData.stripePriceId = subscriptionData.stripePriceId;
  }

  if (subscriptionData.status !== undefined) {
    updateData.subscriptionStatus = subscriptionData.status;
  }

  if (subscriptionData.currentPeriodStart !== undefined) {
    updateData.currentPeriodStart = subscriptionData.currentPeriodStart;
  }

  if (subscriptionData.currentPeriodEnd !== undefined) {
    updateData.currentPeriodEnd = subscriptionData.currentPeriodEnd;
  }

  if (subscriptionData.cancelAtPeriodEnd !== undefined) {
    updateData.cancelAtPeriodEnd = subscriptionData.cancelAtPeriodEnd;
  }

  if (subscriptionData.cancelAt !== undefined) {
    updateData.cancelAt = subscriptionData.cancelAt;
  }

  if (subscriptionData.cancellationReason !== undefined) {
    updateData.cancellationReason = subscriptionData.cancellationReason;
  }

  if (subscriptionData.cancellationFeedback !== undefined) {
    updateData.cancellationFeedback = subscriptionData.cancellationFeedback;
  }

  if (subscriptionData.trialEndsAt !== undefined) {
    updateData.trialEndsAt = subscriptionData.trialEndsAt;
  }

  return getSqliteStore().findOneAndUpdate<User>(
    "users",
    { email },
    { $set: updateData },
    { returnDocument: "after" }
  );
}

export async function updateUserBillingRecoveryState(
  email: string,
  data: {
    status: "failed" | "recovered" | "canceled";
    invoiceId?: string | null;
    attemptCount?: number | null;
    nextPaymentAttempt?: Date | null;
  }
): Promise<void> {
  const now = new Date();

  if (data.status === "failed") {
    const store = getSqliteStore();
    const existing = store.findOne<User>("users", { email });
    store.updateOne<User>(
      "users",
      { email },
      {
        $set: {
          billingPastDueSince:
            existing?.subscriptionStatus === "past_due" && existing?.billingPastDueSince
              ? existing.billingPastDueSince
              : now,
          billingLastPaymentFailedAt: now,
          billingNextPaymentAttempt: data.nextPaymentAttempt || null,
          billingFailedAttemptCount: data.attemptCount ?? null,
          billingLastInvoiceId: data.invoiceId || null,
          updatedAt: now,
        },
      }
    );
    return;
  }

  const update = {
    $set: {
      billingRecoveredAt: data.status === "recovered" ? now : null,
      updatedAt: now,
    },
    $unset: {
      billingPastDueSince: "" as const,
      billingLastPaymentFailedAt: "" as const,
      billingNextPaymentAttempt: "" as const,
      billingFailedAttemptCount: "" as const,
      billingLastInvoiceId: "" as const,
    },
  };

  getSqliteStore().updateOne<User>("users", { email }, update);
}

export async function updateUserPassword(
  email: string,
  password: string
): Promise<boolean> {
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = getSqliteStore().updateOne<User>(
    "users",
    { email },
    {
      $set: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

export async function incrementUserCounter(
  userId: string,
  field: string,
  value?: number
): Promise<void> {
  getSqliteStore().updateOne<User>(
    "users",
    { _id: new ObjectId(userId) },
    {
      $inc: { [field]: value || 1 },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function addFeatureUsed(
  userId: string,
  feature: string
): Promise<void> {
  getSqliteStore().updateOne<User>(
    "users",
    { _id: new ObjectId(userId) },
    {
      $addToSet: { featuresUsed: feature },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function incrementCardStats(userId: string): Promise<void> {
  getSqliteStore().updateOne<User>(
    "users",
    { _id: new ObjectId(userId) },
    {
      $inc: { totalCardsCreated: 1 },
      $set: { lastCardCreatedAt: new Date(), updatedAt: new Date() },
    }
  );
}
