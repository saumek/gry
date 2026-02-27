import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  ROOM_PIN: z.string().trim().min(4, "ROOM_PIN musi mieć min. 4 znaki"),
  SESSION_TTL_MS: z.coerce.number().int().positive().default(30000),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  DB_PATH: z.string().trim().default("./data/app.db"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000)
});

const fallbackPin = process.env.NODE_ENV !== "production" ? "1234" : undefined;

const parsed = envSchema.safeParse({
  ROOM_PIN: process.env.ROOM_PIN ?? fallbackPin,
  SESSION_TTL_MS: process.env.SESSION_TTL_MS,
  HEARTBEAT_INTERVAL_MS: process.env.HEARTBEAT_INTERVAL_MS,
  DB_PATH: process.env.DB_PATH,
  PORT: process.env.PORT
});

if (!parsed.success) {
  throw new Error(`Błąd konfiguracji ENV: ${parsed.error.message}`);
}

export const appConfig = parsed.data;
