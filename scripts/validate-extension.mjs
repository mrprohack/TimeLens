import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));

if (manifest.version !== pkg.version) {
  throw new Error(`Version mismatch: manifest ${manifest.version} != package ${pkg.version}`);
}
if (manifest.manifest_version !== 3) throw new Error('TimeLens must use Manifest V3');
if (manifest.host_permissions) throw new Error('TimeLens must not request broad host permissions');

const approvedPermissions = ['alarms', 'idle', 'notifications', 'storage', 'tabs'];
if (JSON.stringify([...manifest.permissions].sort()) !== JSON.stringify(approvedPermissions)) {
  throw new Error(`Unexpected permissions: ${manifest.permissions.join(', ')}`);
}

const required = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_page,
  'src/dashboard/dashboard.html',
  'src/blocked/blocked.html',
  'src/onboarding/onboarding.html',
  'src/onboarding/onboarding.css',
  'src/onboarding/onboarding.js',
  'PRIVACY.md',
  'LICENSE',
  ...Object.values(manifest.icons)
];

for (const file of required) await access(file, constants.R_OK);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const runtimeFiles = await walk('src');
const jsFiles = runtimeFiles.filter((file) => file.endsWith('.js'));
const htmlFiles = runtimeFiles.filter((file) => file.endsWith('.html'));

for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

for (const file of runtimeFiles.filter((file) => /\.(js|html)$/.test(file))) {
  const source = await readFile(file, 'utf8');
  if (/\bfetch\s*\(/.test(source) || /XMLHttpRequest/.test(source) || /import\s*\(\s*['"]https?:\/\//.test(source)) {
    throw new Error(`${file} contains remote network code`);
  }
  if (/<script[^>]+src=["']https?:\/\//i.test(source)) {
    throw new Error(`${file} loads a remote script`);
  }
  if (/\beval\s*\(/.test(source) || /new\s+Function\s*\(/.test(source)) {
    throw new Error(`${file} contains dynamic code execution`);
  }
}

for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  const ids = [...source.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`${file} contains duplicate ids: ${[...new Set(duplicates)].join(', ')}`);
}

console.log(`Validated TimeLens ${manifest.version}: ${required.length} required files, ${jsFiles.length} JS files syntax-checked, ${htmlFiles.length} pages checked, approved permissions only, no remote or dynamic runtime code.`);
