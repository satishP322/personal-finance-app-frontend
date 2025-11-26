// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cognitoConfig } from "../../../lib/cognitoConfig";

const jwkToPem = require("jwk-to-pem");

let jwksCache: any = null;

async function getCognitoJWKs() {
  if (jwksCache) return jwksCache;
  const res = await fetch(cognitoConfig.jwksUrl);
  const jwks = await res.json();
  jwksCache = jwks;
  return jwks;
}

export async function GET(req: Request) {
  try {
    // ✅ Get token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Decode header to get kid
    const decodedHeader = jwt.decode(token, { complete: true }) as any;
    if (!decodedHeader) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const kid = decodedHeader.header.kid;
    const jwks = await getCognitoJWKs();
    const jwk = jwks.keys.find((key: any) => key.kid === kid);

    if (!jwk) {
      return NextResponse.json({ error: "JWK not found for token" }, { status: 401 });
    }

    const pem = jwkToPem(jwk);
    const payload = jwt.verify(token, pem, { algorithms: ["RS256"] }) as any;

    return NextResponse.json({ success: true, user: payload });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Token verification failed" }, { status: 401 });
  }
}
