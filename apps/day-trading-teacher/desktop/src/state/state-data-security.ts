import type { AppState } from "../domain/types";

const SENSITIVE_FIELD_NAMES = new Set([
  "apikey",
  "apisecret",
  "accesstoken",
  "refreshtoken",
  "bearertoken",
  "clientsecret",
  "credential",
  "credentials",
  "password",
  "passphrase",
  "privatekey",
  "secret",
  "secretaccesskey",
  "token",
  "accesskey",
]);

const SENSITIVE_FIELD_SUFFIXES = [
  "apikey",
  "apisecret",
  "accesstoken",
  "refreshtoken",
  "authtoken",
  "bearertoken",
  "clientsecret",
  "credential",
  "credentials",
  "password",
  "passphrase",
  "privatekey",
  "secret",
  "secretaccesskey",
  "secretkey",
  "accesskey",
] as const;

function normalizedKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function isSensitiveStateField(key: string) {
  const normalized = normalizedKey(key);
  return (
    SENSITIVE_FIELD_NAMES.has(normalized) ||
    SENSITIVE_FIELD_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

export function findSensitiveStateFields(
  value: unknown,
  path = "state",
  findings: string[] = [],
  seen = new WeakSet<object>(),
): string[] {
  if (!value || typeof value !== "object") return findings;
  if (seen.has(value)) return findings;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findSensitiveStateFields(item, `${path}.${index}`, findings, seen),
    );
    return findings;
  }
  for (const [key, item] of Object.entries(value)) {
    if (isSensitiveStateField(key)) findings.push(`${path}.${key}`);
    findSensitiveStateFields(item, `${path}.${key}`, findings, seen);
  }
  return findings;
}

export function serializeStateExport(state: AppState, now = new Date()) {
  return JSON.stringify(
    {
      exportedAt: now.toISOString(),
      app: "day-trading-teacher",
      state,
    },
    (key, value) => (isSensitiveStateField(key) ? undefined : value),
    2,
  );
}
