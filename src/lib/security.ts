import { createHash, randomBytes } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateSecureToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function getRequestMeta(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  const ip = (forwardedFor.split(",")[0] || realIp || "unknown").trim();
  const userAgent = request.headers.get("user-agent") || "unknown";

  return { ip, userAgent };
}
