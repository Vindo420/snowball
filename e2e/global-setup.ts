import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PRODUCTION_PROJECT_ID = 'vklmzhscdfbqjrfbmpgb';

/**
 * Playwright's globalSetup runs in a plain Node process that does NOT load
 * .env (unlike Next.js and Prisma, which load it themselves). Without this,
 * process.env.DATABASE_URL is undefined here and the guard below would
 * silently pass regardless of which database is configured.
 *
 * No dotenv dependency: parse the file directly.
 */
function readEnvFile(): Record<string, string> {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return {};

  const parsed: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    parsed[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return parsed;
}

export default function globalSetup() {
  const fileEnv = readEnvFile();
  const databaseUrl = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL ?? fileEnv.DIRECT_URL;

  // Fail CLOSED. If we cannot establish which database these tests would
  // write to, refuse to run rather than assuming it is safe.
  if (!databaseUrl) {
    throw new Error(
      'Refusing to run E2E tests: DATABASE_URL could not be resolved from the ' +
        'environment or from .env, so the production-database guard cannot verify ' +
        'which database these tests would write to. Fix your .env before re-running.'
    );
  }

  const pointsAtProduction = [databaseUrl, directUrl]
    .filter(Boolean)
    .some((url) => (url as string).includes(PRODUCTION_PROJECT_ID));

  if (pointsAtProduction) {
    throw new Error(
      `Refusing to run E2E tests: DATABASE_URL/DIRECT_URL resolves to the production ` +
        `Supabase project (${PRODUCTION_PROJECT_ID}). These tests create and delete ` +
        `data and must only run against the snowball-dev database.`
    );
  }
}
