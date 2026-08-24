import { defineConfig } from '@playwright/test';

// Port 3000 on this machine is occupied by an unrelated project, so the dev
// server actually runs on 3001, and .env's NEXTAUTH_URL is already set to
// http://localhost:3001 to match. Pin the same port here explicitly —
// Playwright's default of 3000 would otherwise run the suite against the
// wrong application entirely.
const PORT = 3001;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  // The dev server is a single `next dev` process talking to a remote
  // Supabase DB, with bcrypt hashing per signup/login — it can't keep up
  // with Playwright's default (numCPUs) worker count, which causes request
  // timeouts unrelated to test correctness. 2 workers gives some parallelism
  // without overwhelming it.
  workers: 2,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
