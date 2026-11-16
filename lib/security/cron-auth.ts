import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidCronBearer(
  authorizationHeader: string | null,
  expectedSecret: string,
) {
  if (!authorizationHeader) return false;
  const match = authorizationHeader.match(/^Bearer ([^\s]+)$/i);
  if (!match) return false;

  const providedDigest = createHash("sha256").update(match[1]).digest();
  const expectedDigest = createHash("sha256").update(expectedSecret).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}
