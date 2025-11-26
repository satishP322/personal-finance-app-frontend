import { NextResponse } from "next/server";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import { cognitoConfig } from "../../../lib/cognitoConfig";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );

    const userPool = new CognitoUserPool({
      UserPoolId: cognitoConfig.userPoolId,
      ClientId: cognitoConfig.clientId,
    });

    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    return new Promise<NextResponse>((resolve) => {
      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          const idToken = session.getIdToken().getJwtToken();
          const accessToken = session.getAccessToken().getJwtToken();
          const refreshToken = session.getRefreshToken().getToken();
          const userId = session.getIdToken().payload["sub"]; // <-- Added

          // Instead of cookies → return data to frontend
          return resolve(
            NextResponse.json({
              message: "Login successful",
              idToken,
              accessToken,
              refreshToken,
              userId, // <-- Added
            })
          );
        },

        onFailure: (err) =>
          resolve(
            NextResponse.json(
              { error: err.message || "Login failed" },
              { status: 400 }
            )
          ),

        newPasswordRequired: () =>
          resolve(
            NextResponse.json(
              { error: "New password required." },
              { status: 403 }
            )
          ),
      });
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
