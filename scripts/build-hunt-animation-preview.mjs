import { build } from 'esbuild';

// Preview and game share the exact locomotion renderer and hit flash.
await build({
  stdin: {
    contents:
      "export * from './hunt/zombie-animation'; export * from './hunt/zombie-gait';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: 'public/animation-preview/hunt-animation-runtime.js',
});
