import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // `cloudflare:workers` is a Workers-runtime virtual module that Node
      // cannot resolve. Point it at a minimal shim so the DurableObject base
      // class is available when unit tests run under Node.
      'cloudflare:workers': fileURLToPath(
        new URL('./src/durable-objects/cloudflare-workers.shim.ts', import.meta.url)
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/whatsapp/**', // WhatsApp client requires browser environment
      ],
    },
  },
});
