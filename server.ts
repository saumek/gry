import http from "node:http";

import next from "next";

import { appConfig } from "./src/lib/config";
import { createSocketRuntime } from "./src/server/socket/create-runtime";

const isDev = process.env.NODE_ENV !== "production";
const host = appConfig.HOST;
const port = appConfig.PORT;

const app = next({ dev: isDev, hostname: host, port });
const handle = app.getRequestHandler();

async function bootstrap(): Promise<void> {
  await app.prepare();

  const server = http.createServer((req, res) => handle(req, res));

  const realtime = createSocketRuntime({
    httpServer: server,
    roomPin: appConfig.ROOM_PIN,
    heartbeatIntervalMs: appConfig.HEARTBEAT_INTERVAL_MS,
    sessionTtlMs: appConfig.SESSION_TTL_MS,
    dbPath: appConfig.DB_PATH
  });

  server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`DuoPlay działa na http://${host}:${port}`);
  });

  const shutdown = async (): Promise<void> => {
    await realtime.close();
    server.close(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Błąd startu serwera", error);
  process.exit(1);
});
