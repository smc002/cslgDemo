import { build } from 'esbuild';

// Preview and game share facing, interruption and variable-duration sampling.
await build({
  entryPoints: ['hunt/zombie-animation.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: 'public/animation-preview/hunt-animation-runtime.js',
});
