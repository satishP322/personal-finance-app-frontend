import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

interface UserPayload {
  _id: string;
  email: string;
}

export function getUserFromRequest(req: NextRequest): UserPayload | null {
  // Correct way to get cookie value in Next.js App Router
  const token = req.cookies.get("token")?.value; 
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
    return payload;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
