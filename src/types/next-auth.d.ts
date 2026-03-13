import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    authSessionId?: string;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      currentSessionId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    authSessionId?: string;
  }
}
