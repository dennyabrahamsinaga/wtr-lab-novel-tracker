import type { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/db";

const env = getServerEnv();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: env.GITHUB_ID && env.GITHUB_SECRET ? [
    GithubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
    }),
  ] : [],
  session: {
    strategy: "database",
  },
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

export function isAuthConfigured() {
  return Boolean(env.NEXTAUTH_SECRET && env.GITHUB_ID && env.GITHUB_SECRET);
}
