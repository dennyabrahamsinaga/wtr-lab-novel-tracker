import NextAuth from "next-auth/next";
import { authOptions, isAuthConfigured } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const handler = isAuthConfigured()
  ? NextAuth(authOptions)
  : async function notConfigured() {
      return NextResponse.json(
        { error: "Auth is not configured (set GITHUB_ID/GITHUB_SECRET/NEXTAUTH_SECRET)" },
        { status: 501 },
      );
    };

export { handler as GET, handler as POST };
