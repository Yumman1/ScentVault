#!/usr/bin/env tsx
/**
 * Destructive: delete every row from every app-managed table.
 * Auth users and the `profiles` table are not touched.
 *
 * Run:  npm run test:wipe
 * Safety gate: requires TESTS_ALLOW_WIPE=1 in .env.test.
 */
import { wipeAll, countAllRows, signInAdmin } from './db';
import { TEST_ENV } from '../env';

async function main() {
  // eslint-disable-next-line no-console
  console.log('\x1b[41m\x1b[37m [ScentVault test wipe] \x1b[0m');
  // eslint-disable-next-line no-console
  console.log(`Target: ${TEST_ENV.supabaseUrl}`);
  // eslint-disable-next-line no-console
  console.log(`Admin:  ${TEST_ENV.adminEmail}`);

  const admin = await signInAdmin();

  const before = await countAllRows(admin.client);
  // eslint-disable-next-line no-console
  console.log('Row counts BEFORE:', before);

  await wipeAll(admin.client);

  const after = await countAllRows(admin.client);
  // eslint-disable-next-line no-console
  console.log('Row counts AFTER :', after);

  const leftover = Object.entries(after).filter(([, n]) => n > 0);
  if (leftover.length > 0) {
    throw new Error(
      `Wipe left rows behind: ${leftover.map(([t, n]) => `${t}=${n}`).join(', ')}`,
    );
  }

  // eslint-disable-next-line no-console
  console.log('\x1b[42m\x1b[30m WIPE COMPLETE \x1b[0m');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
