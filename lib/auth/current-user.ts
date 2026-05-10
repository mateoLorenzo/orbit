// MVP has no auth. The demo user UUID lives in env (DEMO_USER_ID) so
// it's not a code constant. The same UUID is the sole row in auth.users
// + profiles, seeded by scripts/seed-demo-data.ts (Plan 5).
export const CURRENT_USER_ID =
  process.env.DEMO_USER_ID ?? '00000000-0000-4000-8000-000000000001'
