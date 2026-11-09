// Builds dist/lionel-train-card.js (the card) and dist/lionel-train-3d.js (three.js + scene,
// fetched by the card only when the 3D view is on screen).
import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const scene = readFileSync('src/scene-head.part.js', 'utf8') + readFileSync('src/scene-builders.part.js', 'utf8') + '}\n';
mkdirSync('build', { recursive: true });
writeFileSync('build/scene3d.js', scene);

const common = { bundle: true, format: 'esm', minify: true, target: 'es2020', legalComments: 'none', logLevel: 'info' };
const jobs = [
  { ...common, entryPoints: ['src/card.js'], outfile: 'dist/lionel-train-card.js' },
  { ...common, entryPoints: ['build/scene3d.js'], outfile: 'dist/lionel-train-3d.js' },
];
if (process.argv.includes('--watch')) {
  for (const j of jobs) await (await context(j)).watch();
} else {
  await Promise.all(jobs.map((j) => build(j)));
  // HACS installs the file named in hacs.json from the repo root or dist/.
  copyFileSync('dist/lionel-train-card.js', 'lionel-train-card.js');
}
