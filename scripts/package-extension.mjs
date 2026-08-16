import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const packageRoot = path.resolve('dist', 'timelens');
const zipPath = path.resolve('dist', `timelens-${manifest.version}.zip`);
const productionPaths = ['manifest.json', 'icons', 'src', 'PRIVACY.md', 'LICENSE'];

await rm(path.resolve('dist'), { recursive: true, force: true });
await mkdir(packageRoot, { recursive: true });

for (const source of productionPaths) {
  await cp(source, path.join(packageRoot, source), { recursive: true });
}

try {
  execFileSync('zip', ['-qr', zipPath, '.'], { cwd: packageRoot, stdio: 'pipe' });
} catch (error) {
  throw new Error(`Could not create ${path.basename(zipPath)}. Ensure the zip command is installed. ${error.message}`);
}

console.log(`Created ${path.relative(process.cwd(), zipPath)}`);
