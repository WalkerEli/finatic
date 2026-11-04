
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "auth_token";
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export const DEMO_EMAIL = "demo@finatic.test";
export const DEMO_PASSWORD = "Finatic123!";

export const DEMO_LOGIN_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

export type Session = {
  userId: number;
  email: string;
  demo?: boolean;
};

export function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    return null;
  }

  return secret;
}

export function verifySession(
  token: string | undefined
): Session | null {
  const secret = getJwtSecret();

  if (!secret || !token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "finatic",
      audience: "finatic-web",
    });

    if (
      typeof payload === "string" ||
      typeof payload.userId !== "number" ||
      !Number.isSafeInteger(payload.userId) ||
      payload.userId <= 0 ||
      typeof payload.email !== "string" ||
      payload.email.length === 0
    ) {
      return null;
    }

    if (payload.demo === true && !DEMO_LOGIN_ENABLED) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      demo: payload.demo === true,
    };
  } catch {
    return null;
  }
}
