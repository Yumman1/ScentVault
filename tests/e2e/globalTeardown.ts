import { signInAdmin, wipeAll } from '../helpers/db';

export default async function globalTeardown() {
  // eslint-disable-next-line no-console
  console.log('[e2e] globalTeardown: wiping database');
  try {
    const admin = await signInAdmin();
    await wipeAll(admin.client);
    // eslint-disable-next-line no-console
    console.log('[e2e] globalTeardown: done');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[e2e] globalTeardown failed (non-fatal):', err);
  }
}
