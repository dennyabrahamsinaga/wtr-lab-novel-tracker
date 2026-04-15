import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: isAuthConfigured() });
}

