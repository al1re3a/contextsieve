import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildBundle, collectFiles, rankFiles, redactSecrets } from '../src/index.js';

test('redacts common credentials', () => {
  const input = 'token=ghp_abcdefghijklmnopqrstuvwxyz123456 password=hunter2 Bearer abcdefghijklmnopqrstuvwxyz';
  const output = redactSecrets(input);
  assert.doesNotMatch(output, /ghp_|hunter2|abcdefghijklmnopqrstuvwxyz/);
});

test('does not redact ordinary bearer prose', () => {
  assert.equal(redactSecrets('supports bearer credentials safely'), 'supports bearer credentials safely');
});

test('query ranking favors matching source', () => {
  const ranked = rankFiles([
    { path: 'src/auth.js', content: 'login session oauth', bytes: 24 },
    { path: 'src/colors.js', content: 'red green blue', bytes: 20 }
  ], 'fix oauth login');
  assert.equal(ranked[0].path, 'src/auth.js');
});

test('collector respects gitignore and skips binary files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'contextsieve-'));
  await mkdir(path.join(root, 'src'));
  await mkdir(path.join(root, 'ignored'));
  await writeFile(path.join(root, '.gitignore'), 'ignored\n');
  await writeFile(path.join(root, 'src', 'main.js'), 'export const ok = true;');
  await writeFile(path.join(root, 'ignored', 'secret.js'), 'nope');
  await writeFile(path.join(root, 'image.bin'), Buffer.from([0, 1, 2]));
  const files = await collectFiles(root);
  assert.deepEqual(files.map((file) => file.path).sort(), ['.gitignore', 'src/main.js']);
});

test('bundle stays under approximate budget', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'contextsieve-'));
  await writeFile(path.join(root, 'README.md'), 'A'.repeat(700));
  await writeFile(path.join(root, 'tiny.js'), 'export default 1;');
  const result = await buildBundle({ root, budget: 250, query: 'tiny' });
  assert.ok(result.metadata.estimatedTokens <= 250);
  assert.match(result.text, /tiny\.js/);
});
