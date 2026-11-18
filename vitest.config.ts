import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/server/**/*.test.ts', 'tests/shared/**/*.test.ts'],
    environment: 'node',
    // A zone with DST, so recurrence tests catch hour drift.
    env: { TZ: 'America/New_York' },
  },
});
