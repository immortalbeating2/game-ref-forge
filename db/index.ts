import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type NativeD1PreparedStatement = {
  bind(...values: unknown[]): NativeD1PreparedStatement;
};

export type NativeD1Binding = {
  prepare(query: string): NativeD1PreparedStatement;
  batch(statements: NativeD1PreparedStatement[]): Promise<unknown[]>;
};

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export function getD1Binding(): NativeD1Binding {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return env.DB as unknown as NativeD1Binding;
}
