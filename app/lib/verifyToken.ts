// lib/verifyToken.ts
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { cognitoConfig } from "./cognitoConfig";

const JWKS = createRemoteJWKSet(new URL(cognitoConfig.jwksUrl));

export async function verifyIdToken(idToken: string) {
  // Verify signature and expiration. `aud` and `iss` checks are done below.
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`,
    // audience (client id) is validated below because Cognito sometimes uses multiple audiences.
  });

  // payload is a JWTPayload type
  const aud = payload.aud ?? (payload as any).client_id;
  if (!aud) throw new Error("Token missing audience");
  if (Array.isArray(aud)) {
    if (!aud.includes(cognitoConfig.clientId)) throw new Error("Token audience mismatch");
  } else {
    if (aud !== cognitoConfig.clientId) throw new Error("Token audience mismatch");
  }

  return payload as JWTPayload & { sub?: string; email?: string; email_verified?: boolean; "cognito:username"?: string };
}
