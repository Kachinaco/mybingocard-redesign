import { notifySignup, notifySignIn } from "@/lib/discord";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./lib/mongodb";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { ATTRIBUTION_COOKIE_NAME, parseAttributionCookie, stripOAuthReferrer } from "@/lib/attribution";
import { createUser, ensureUserDefaults, getUserByEmail, getUserById, incrementUserCounter, updateUserAttribution, updateUserLastAttribution, updateUserSignupMethod } from "./lib/db/users";
import { sendWelcomeEmail } from "./lib/email";
import { trackActivity } from "./lib/activity";
import { IMPERSONATION_COOKIE_NAME, parseImpersonationCookie } from "@/lib/impersonation";

const authBaseUrl =
  process.env.AUTH_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:4000";
const useSecureAuthCookies = authBaseUrl.startsWith("https://");
const authCookiePrefix = useSecureAuthCookies ? "__Secure-" : "";
const oauthCookieSameSite = useSecureAuthCookies ? "none" : "lax";
const appleAuthConfigured = Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/auth-new-user",
    error: "/auth-error",
  },
  cookies: {
    pkceCodeVerifier: {
      name: `${authCookiePrefix}authjs.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: oauthCookieSameSite,
        path: "/",
        secure: useSecureAuthCookies,
        maxAge: 60 * 15,
      },
    },
    state: {
      name: `${authCookiePrefix}authjs.state`,
      options: {
        httpOnly: true,
        sameSite: oauthCookieSameSite,
        path: "/",
        secure: useSecureAuthCookies,
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: `${authCookiePrefix}authjs.nonce`,
      options: {
        httpOnly: true,
        sameSite: oauthCookieSameSite,
        path: "/",
        secure: useSecureAuthCookies,
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    ...(appleAuthConfigured
      ? [
          Apple({
            clientId: process.env.AUTH_APPLE_ID!,
            clientSecret: process.env.AUTH_APPLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      id: "guest",
      name: "guest",
      credentials: {
        userId: { label: "User ID", type: "text" },
        guestToken: { label: "Guest Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.guestToken) {
          return null;
        }

        try {
          const client = await clientPromise;
          const db = client.db("mybingocard");
          const { ObjectId } = await import("mongodb");

          let objectId: InstanceType<typeof ObjectId>;
          try {
            objectId = new ObjectId(credentials.userId as string);
          } catch {
            return null;
          }

          // Atomic single-use: match the token+expiry and clear it in one op.
          // The DB query itself encapsulates the token comparison, so there is
          // no need for a separate timingSafeEqual — MongoDB's equality match
          // on an indexed field performs the comparison server-side and the
          // $unset guarantees the token cannot be reused even under races.
          const result = await db.collection("users").findOneAndUpdate(
            {
              _id: objectId,
              customerType: "guest",
              guestClaimToken: credentials.guestToken as string,
              guestClaimTokenExpiresAt: { $gt: new Date() },
            },
            { $unset: { guestClaimToken: "", guestClaimTokenExpiresAt: "" } },
            { returnDocument: "before" }
          );

          const user = result as any;
          if (!user) return null;

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || "Guest",
            image: user.image || null,
          };
        } catch (error) {
          console.error("Guest authorize error:", error);
          return null;
        }
      },
    }),
    Credentials({
      id: "magic-link",
      name: "magic-link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = typeof credentials?.token === "string" ? credentials.token : "";
        if (token.length < 32 || token.length > 256) return null;

        try {
          const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
          const client = await clientPromise;
          const db = client.db("mybingocard");
          const record = await db.collection("magic_link_tokens").findOneAndDelete({
            tokenHash,
            expiresAt: { $gt: new Date() },
          });

          if (!record?.email || record.email.endsWith("@guest.mybingocard.com")) {
            return null;
          }

          let user = await getUserByEmail(record.email);
          if (!user) {
            user = await createUser({
              email: record.email,
              name: record.email.split("@")[0],
              signupMethod: "magic_link",
            });
            await db.collection("users").updateOne(
              { _id: user._id },
              { $set: { emailVerified: new Date(), updatedAt: new Date() } }
            );
            user.emailVerified = new Date();
          } else if (!user.emailVerified) {
            await db.collection("users").updateOne(
              { _id: user._id },
              { $set: { emailVerified: new Date(), updatedAt: new Date() } }
            );
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email.split("@")[0],
            image: user.image,
          };
        } catch (error) {
          console.error("Magic link authorize error:", error);
          return null;
        }
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // --- IP-based login rate limiting ---
        try {
          const client = await clientPromise;
          const db = client.db("mybingocard");
          const ip =
            (request as Request & { headers?: Headers })?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
            (request as Request & { headers?: Headers })?.headers?.get?.("x-real-ip") ||
            "unknown";

          if (ip !== "unknown") {
            const windowStart = new Date(Date.now() - 15 * 60 * 1000); // 15-minute window
            const failures = await db.collection("login_attempts").countDocuments({
              ip,
              success: false,
              createdAt: { $gte: windowStart },
            });
            if (failures >= 3) {
              throw new Error("TOO_MANY_ATTEMPTS");
            }
          }
        } catch (e: unknown) {
          if ((e as Error).message === "TOO_MANY_ATTEMPTS") throw e;
          // If rate-limit check fails for other reasons, allow through
        }
        // --- end rate limiting ---

        const user = await getUserByEmail(credentials.email as string);

        // Record attempt result for rate limiting
        try {
          const client = await clientPromise;
          const db = client.db("mybingocard");
          const ip =
            (request as Request & { headers?: Headers })?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
            (request as Request & { headers?: Headers })?.headers?.get?.("x-real-ip") ||
            "unknown";
          const success = !!(user?.password && await bcrypt.compare(credentials.password as string, user.password) && user.emailVerified);
          await db.collection("login_attempts").insertOne({
            ip,
            email: credentials.email,
            success,
            createdAt: new Date(),
          });
          // TTL cleanup: keep only last 24h (index handles this)
        } catch { /* non-fatal */ }

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        // Block login if email not verified (credentials signup only)
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    async signIn(message) {
      const event = message as {
        user?: { id?: string | null; email?: string | null };
        account?: { provider?: string | null };
        isNewUser?: boolean;
      };

      if (!event.user?.email) {
        return;
      }

      // Guest sign-ins are ephemeral — skip Discord notifications and welcome
      // emails entirely. Guests don't have real email addresses.
      if (event.account?.provider === "guest") {
        return;
      }

      const provider = event.account?.provider || "unknown";
      let attribution: Record<string, string> = {};

      if (event.user.id) {
        try {
          const cookieStore = await cookies();
          attribution = stripOAuthReferrer(
            parseAttributionCookie(
              cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value
            )
          );

          if (Object.keys(attribution).length > 0) {
            await updateUserLastAttribution(event.user.id, attribution);
            if (event.isNewUser) {
              await updateUserAttribution(event.user.id, attribution);
            }
          }

          // Auto-verify email for OAuth and magic link users
          if (provider === "google" || provider === "apple" || provider === "magic-link") {
            const existingUser = await getUserById(event.user.id);
            if (existingUser && !existingUser.emailVerified) {
              const client = await clientPromise;
              const db = client.db("mybingocard");
              await db.collection("users").updateOne(
                { _id: new (await import("mongodb")).ObjectId(event.user.id) },
                { $set: { emailVerified: new Date(), updatedAt: new Date() } }
              );
            }
          }

          if (event.isNewUser) {
            const signupMethod =
              provider === "google"
                ? "google"
                : provider === "apple"
                  ? "apple"
                : provider === "magic-link"
                  ? "magic_link"
                  : provider === "credentials"
                    ? "credentials"
                    : null;

            if (signupMethod) {
              await updateUserSignupMethod(event.user.id, signupMethod);
            }
          }

          // Behavior counters
          await incrementUserCounter(event.user.id, "loginCount");
          const client2 = await clientPromise;
          const db2 = client2.db("mybingocard");
          await db2.collection("users").updateOne(
            { _id: new (await import("mongodb")).ObjectId(event.user.id) },
            { $set: { lastLoginAt: new Date() } }
          );
        } catch (error) {
          console.error("Failed to capture sign-in attribution:", error);
        }
      }

      try {
        await trackActivity({
          event: "login_succeeded",
          source: "auth",
          userId: event.user.id || null,
          email: event.user.email,
          metadata: {
            provider,
            isNewUser: Boolean(event.isNewUser),
            ...attribution,
          },
        });

        if (provider === "magic-link") {
          await trackActivity({
            event: "magic_link_opened",
            source: "auth",
            userId: event.user.id || null,
            email: event.user.email,
            metadata: {
              provider,
              isNewUser: Boolean(event.isNewUser),
              ...attribution,
            },
          });
        }

        // Skip Discord alert for new users (they get the signup notification)
        if (!event.isNewUser) {
          notifySignIn((event.user as any).name || "", event.user.email, provider).catch(console.error);
        }
      } catch (error) {
        console.error("Failed to track sign-in activity:", error);
      }
    },
    async createUser({ user }) {
      let fullUser = null;
      let signupAttribution: Record<string, string> = {};

      if (user.id) {
        try {
          const cookieStore = await cookies();
          const attribution = stripOAuthReferrer(
            parseAttributionCookie(
              cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value
            )
          );

          signupAttribution = attribution;

          if (Object.keys(attribution).length > 0) {
            fullUser = await updateUserAttribution(user.id, attribution);
          }
        } catch (error) {
          console.error("Failed to read signup attribution cookie:", error);
        }
      }

      if (user.id) {
        fullUser = await ensureUserDefaults(user.id);
      }
      if (!user.email) return;
      sendWelcomeEmail(user.email, user.name || "there").catch((error) => {
        console.error("Failed to send welcome email after user creation:", error);
      });

      if (!fullUser && user.email) {
        fullUser = await getUserByEmail(user.email);
      }

      if (Object.keys(signupAttribution).length === 0 && fullUser) {
        signupAttribution = {
          ...(fullUser.utm_source ? { utm_source: fullUser.utm_source } : {}),
          ...(fullUser.utm_medium ? { utm_medium: fullUser.utm_medium } : {}),
          ...(fullUser.utm_campaign ? { utm_campaign: fullUser.utm_campaign } : {}),
          ...(fullUser.utm_content ? { utm_content: fullUser.utm_content } : {}),
          ...(fullUser.utm_term ? { utm_term: fullUser.utm_term } : {}),
          ...(fullUser.referrer ? { referrer: fullUser.referrer } : {}),
        };
      }

      notifySignup(user.name || fullUser?.name || "Google User", user.email, fullUser || undefined).catch(console.error);
      try {
        await trackActivity({
          event: "signup_completed",
          source: "auth",
          userId: user.id || fullUser?._id?.toString() || null,
          email: user.email,
          metadata: {
            provider: fullUser?.password ? "credentials" : "oauth_or_magic_link",
            ...signupAttribution,
          },
        });
      } catch (error) {
        console.error("Failed to track signup activity:", error);
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }

      // Stamp subscription fields on initial sign-in, manual refresh, or every 5 min
      const needsRefresh =
        user ||
        trigger === "update" ||
        !token.subscriptionStatus ||
        (token.lastRefreshed && Date.now() - (token.lastRefreshed as number) > 5 * 60 * 1000);

      if (needsRefresh && token.id) {
        const dbUser = await getUserById(token.id as string);
        if (dbUser) {
          token.planType = dbUser.planType || "FREE";
          token.subscriptionStatus = dbUser.subscriptionStatus || "inactive";
          token.customerType = dbUser.customerType || "real";
          token.lastRefreshed = Date.now();
        }
      }

      // Guest session lifetime cap: clamp ephemeral guest sessions to 24h
      // regardless of the 30-day cookie default.
      if (token.customerType === "guest") {
        if (!token.guestSessionExpiresAt) {
          token.guestSessionExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
        } else if (Date.now() > (token.guestSessionExpiresAt as number)) {
          return null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).customerType = token.customerType || "real";
      }

      // Expose subscription fields on the session for middleware
      const sessionWithSub = session as typeof session & {
        planType?: string;
        subscriptionStatus?: string;
      };
      sessionWithSub.planType = (token.planType as string) || "FREE";
      sessionWithSub.subscriptionStatus = (token.subscriptionStatus as string) || "inactive";

      const sessionWithActor = session as typeof session & {
        actor?: {
          id?: string;
          email?: string | null;
          name?: string | null;
        };
        impersonation?: {
          active: boolean;
          targetUserId: string;
          targetEmail: string;
          targetName?: string | null;
          startedAt: string;
        };
      };

      sessionWithActor.actor = {
        id: typeof token.id === "string" ? token.id : undefined,
        email: typeof token.email === "string" ? token.email : null,
        name: typeof token.name === "string" ? token.name : null,
      };

      if (
        sessionWithActor.actor.email &&
        sessionWithActor.actor.email === process.env.ADMIN_EMAIL
      ) {
        try {
          const cookieStore = await cookies();
          const impersonation = parseImpersonationCookie(
            cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value
          );

          if (
            impersonation &&
            impersonation.adminEmail === sessionWithActor.actor.email
          ) {
            const targetUser = await getUserById(impersonation.targetUserId);

            if (
              targetUser &&
              targetUser.email === impersonation.targetEmail
            ) {
              session.user.id = targetUser._id.toString();
              session.user.email = targetUser.email;
              session.user.name = targetUser.name || targetUser.email;
              session.user.image = targetUser.image || null;
              sessionWithActor.impersonation = {
                active: true,
                targetUserId: targetUser._id.toString(),
                targetEmail: targetUser.email,
                targetName: targetUser.name || null,
                startedAt: impersonation.startedAt,
              };
            }
          }
        } catch (error) {
          console.error("Failed to apply impersonation session:", error);
        }
      }

      return session;
    },
  },
});
