import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 7"] }
    }
  ],
  webServer: {
    command:
      "ROOM_PIN=1234 SESSION_TTL_MS=2500 HEARTBEAT_INTERVAL_MS=800 npx tsx server.ts",
    port: 3000,
    reuseExistingServer: false,
    timeout: 120000
  }
});
