#!/usr/bin/env node
/**
 * Custom build script to bundle the Worker code with workspace dependencies
 */

import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Plugin to resolve workspace packages
const workspacePlugin = {
  name: 'workspace',
  setup(build) {
    build.onResolve({ filter: /^@scorebot\/shared$/ }, args => {
      return {
        path: resolve(__dirname, '../shared/src/index.ts'),
      };
    });
  },
};

async function build() {
  try {
    await esbuild.build({
      entryPoints: [resolve(__dirname, 'src/index.ts')],
      bundle: true,
      outfile: resolve(__dirname, 'dist/index.js'),
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      external: [],
      conditions: ['worker', 'browser'],
      mainFields: ['browser', 'module', 'main'],
      resolveExtensions: ['.ts', '.js'],
      loader: {
        '.ts': 'ts',
      },
      tsconfig: resolve(__dirname, 'tsconfig.json'),
      plugins: [workspacePlugin],
    });
    console.log('✅ Build successful');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
