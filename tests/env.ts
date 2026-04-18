import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

loadEnv({ path: path.join(root, '.env.test') });

/**
 * dotenv parses `KEY==https://...` as value `=https://...` (double `=` typo).
 * Strip one leading `=` and trim so Supabase accepts the URL/key.
 */
function normalizeEnvValue(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('=')) s = s.slice(1).trim();
  // Strip optional surrounding quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '' || v.includes('your-')) {
    throw new Error(
      `Missing env var ${name}. Copy .env.test.example to .env.test and fill it in.`,
    );
  }
  return normalizeEnvValue(v);
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  if (!v || v.trim() === '') return undefined;
  return normalizeEnvValue(v);
}

export const TEST_ENV = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  adminEmail: required('TEST_ADMIN_EMAIL'),
  adminPassword: required('TEST_ADMIN_PASSWORD'),
  operatorEmail: optional('TEST_OPERATOR_EMAIL'),
  operatorPassword: optional('TEST_OPERATOR_PASSWORD'),
  viewerEmail: optional('TEST_VIEWER_EMAIL'),
  viewerPassword: optional('TEST_VIEWER_PASSWORD'),
  appUrl: process.env.APP_URL
    ? normalizeEnvValue(process.env.APP_URL)
    : 'http://localhost:3000',
  allowWipe: process.env.TESTS_ALLOW_WIPE === '1',
};

export function assertWipeAllowed() {
  if (!TEST_ENV.allowWipe) {
    // eslint-disable-next-line no-console
    console.error(
      '\n\x1b[41m\x1b[37m REFUSING TO WIPE DATABASE \x1b[0m\n' +
        'Set TESTS_ALLOW_WIPE=1 in .env.test to allow destructive test runs.\n',
    );
    throw new Error('TESTS_ALLOW_WIPE=1 not set');
  }
}
