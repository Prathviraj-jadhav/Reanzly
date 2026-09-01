import { z } from "zod";

/** Read a string env var; returns undefined when unset or empty. */
export function getEnv(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === "") return undefined;
  return value;
}

/** Read a required env var; throws when missing. */
export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Parse env with a Zod schema; throws on invalid shape. */
export function parseEnv<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  return schema.parse(process.env);
}
