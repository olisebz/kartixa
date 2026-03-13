import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { authSecurityService } from "@/server/services/authSecurityService";
import { normalizeDeviceId } from "@/server/auth/security";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        deviceId: { label: "Device ID", type: "text" },
        challengeId: { label: "Challenge ID", type: "text" },
        verificationCode: { label: "Verification code", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const deviceId = normalizeDeviceId(String(credentials?.deviceId ?? ""));
        const challengeId = String(credentials?.challengeId ?? "").trim();
        const verificationCode = String(credentials?.verificationCode ?? "").trim();

        if (!email || !password) return null;

        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        const requiresDeviceVerification =
          !user.emailVerifiedAt || !(await authSecurityService.isTrustedDevice(user.id, deviceId));

        if (requiresDeviceVerification) {
          if (!challengeId || !verificationCode) {
            return null;
          }

          await authSecurityService.consumeNewDeviceChallenge({
            userId: user.id,
            email: user.email,
            challengeId,
            code: verificationCode,
          });
        }

        const userAgent = request.headers.get("user-agent");
        const ipAddress =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("x-real-ip");

        await authSecurityService.trustDevice({
          userId: user.id,
          deviceId,
          userAgent,
        });

        const session = await authSecurityService.createUserSession({
          userId: user.id,
          deviceId,
          userAgent,
          ipAddress,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          authSessionId: session.sessionId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.authSessionId = user.authSessionId;
      }

      if (
        typeof token.sub === "string" &&
        typeof token.authSessionId === "string"
      ) {
        const validSession = await authSecurityService.validateUserSession({
          userId: token.sub,
          sessionId: token.authSessionId,
        });

        if (!validSession) {
          delete token.sub;
          delete token.name;
          delete token.email;
          delete token.authSessionId;
        }
      }

      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.sub === "string") {
        session.user.id = token.sub;
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.authSessionId === "string") {
          session.user.currentSessionId = token.authSessionId;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
