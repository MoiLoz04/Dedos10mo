
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",

  timeout: 60_000,

  expect: {
    timeout: 15_000,
  },

  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [
    ["list"],
    ["html", {
      outputFolder: "reporte-html",
      open: "never",
    }],
    ["json", {
      outputFile: "resultados/resultados.json",
    }],
  ],

  use: {
    baseURL: BASE_URL,
    viewport: {
      width: 1280,
      height: 900,
    },
    locale: "es-MX",

    screenshot: "on",
    trace: "retain-on-failure",

    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: {
          width: 1280,
          height: 900,
        },
      },
    },
  ],

  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
