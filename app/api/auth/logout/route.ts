// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  // Simply return a success message
  return NextResponse.json({ message: "Logged out successfully" });
}
