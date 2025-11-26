// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { CognitoUserPool, CognitoUserAttribute } from "amazon-cognito-identity-js";
import { cognitoConfig } from "../../../lib/cognitoConfig";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

    const userPool = new CognitoUserPool({
      UserPoolId: cognitoConfig.userPoolId,
      ClientId: cognitoConfig.clientId,
    });

    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];

    return new Promise<NextResponse>((resolve) => {
      // FIX → replace `null` or `undefined` with []
      userPool.signUp(email, password, attributes, [], (err, result) => {
        if (err) {
          return resolve(
            NextResponse.json(
              { error: err.message || "Signup failed" },
              { status: 400 }
            )
          );
        }

        return resolve(
          NextResponse.json({
            message: "Signup successful!",
            username: result?.user?.getUsername(),
          })
        );
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Signup failed" },
      { status: 500 }
    );
  }
}
