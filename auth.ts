import { notifySignup, notifySignIn, notifyMagicLink } from "@/lib/discord";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import { cookies } from "next/headers";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./lib/mongodb";
import bcrypt from "bcryptjs";
import { ATTRIBUTION_COOKIE_NAME, parseAttributionCookie } from "@/lib/attribution";
import { ensureUserDefaults, getUserByEmail, getUserById, updateUserAttribution } from "./lib/db/users";
import { sendMagicLinkEmail, sendWelcomeEmail } from "./lib/email";
import { trackActivity } from "./lib/activity";
import { IMPERSONATION_COOKIE_NAME, parseImpersonationCookie } from "@/lib/impersonation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/create?new=1",
    error: "/auth-error",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
            const windowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour window
            const failures = await db.collection("login_attempts").countDocuments({
              ip,
              success: false,
              createdAt: { $gte: windowStart },
            });
            if (failures >= 10) {
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
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM!,
      async sendVerificationRequest(params: { identifier: string; url: string }) {
        await sendMagicLinkEmail(params.identifier, params.url);
        notifyMagicLink(params.identifier).catch(console.error);
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

      await trackActivity({
        event: "login_succeeded",
        source: "auth",
        userId: event.user.id || null,
        email: event.user.email,
        metadata: {
          provider: event.account?.provider || "unknown",
          isNewUser: Boolean(event.isNewUser),
        },
      });

      // Skip Discord alert for new users (they get the signup notification)
      if (!event.isNewUser) {
        notifySignIn((event.user as any).name || "", event.user.email, event.account?.provider || "unknown").catch(console.error);
      }
    },
    async createUser({ user }) {
      let fullUser = null;

      if (user.id) {
        try {
          const cookieStore = await cookies();
          const attribution = parseAttributionCookie(
            cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value
          );

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

      notifySignup(user.name || fullUser?.name || "Google User", user.email, fullUser || undefined).catch(console.error);
      await trackActivity({
        event: "signup_completed",
        source: "auth",
        userId: user.id || fullUser?._id?.toString() || null,
        email: user.email,
        metadata: {
          provider: fullUser?.password ? "credentials" : "oauth_or_magic_link",
        },
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }

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
