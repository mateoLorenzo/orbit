import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/server/**/*.test.ts', 'lib/db/**/*.test.ts', 'lib/api/**/*.test.ts', 'lib/domain/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
