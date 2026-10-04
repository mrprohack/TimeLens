import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createZip } from './lib/zip.mjs';

// Builds dist/timelens-<version>.zip for Chrome Web Store upload.
// Only the runtime paths below are shipped; everything else stays in the repo.
const productionPaths = ['manifest.json', 'icons', 'src', 'PRIVACY.md', 'LICENSE'];

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const distDir = path.resolve('dist');
const zipPath = path.join(distDir, `timelens-${manifest.version}.zip`);

async function collect(entryPath) {
  const entries = await readdir(entryPath, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOTDIR') return null;
    throw error;
  });
  if (!entries) return [entryPath];
  const files = [];
  for (const entry of entries) files.push(...await collect(path.join(entryPath, entry.name)));
  return files;
}

const files = [];
for (const source of productionPaths) files.push(...await collect(source));

const archiveEntries = await Promise.all(files.map(async (file) => ({
  name: file.split(path.sep).join('/'),
  data: await readFile(file)
})));

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await writeFile(zipPath, createZip(archiveEntries));

console.log(`Created ${path.relative(process.cwd(), zipPath)} (${archiveEntries.length} files)`);
