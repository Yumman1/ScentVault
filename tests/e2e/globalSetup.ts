import { signInAdmin, wipeAll } from '../helpers/db';
import { TEST_ENV } from '../env';

export default async function globalSetup() {
  // eslint-disable-next-line no-console
  console.log('[e2e] globalSetup: wiping database');
  const admin = await signInAdmin();
  await wipeAll(admin.client);
  // eslint-disable-next-line no-console
  console.log(`[e2e] globalSetup: done. app=${TEST_ENV.appUrl}`);
}
