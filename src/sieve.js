import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_IGNORES = [
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache',
  'vendor', '__pycache__', '.venv', 'venv', 'target', '*.lock', '*.min.js',
  '*.map', '*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.ico', '*.pdf',
  '*.zip', '*.gz', '*.woff', '*.woff2', '*.ttf', '*.exe', '*.dll'
];

const SECRET_PATTERNS = [
  [/\b(?:sk|pk)-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_API_KEY]'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]'],
  [/\b(?:Bearer\s+)[A-Za-z0-9._~+\/-]+=*\b/gi, 'Bearer [REDACTED]'],
  [/((?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*)['"]?[^\s'";,]+/gi, '$1[REDACTED]']
];

const HIGH_SIGNAL = new Map([
  ['readme.md', 35], ['package.json', 30], ['pyproject.toml', 30],
  ['cargo.toml', 30], ['go.mod', 30], ['agents.md', 28],
  ['dockerfile', 22], ['compose.yaml', 22], ['docker-compose.yml', 22]
]);

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§§').replace(/\*/g, '[^/]*').replace(/§§/g, '.*');
  return new RegExp(`(^|/)${escaped}($|/)`, 'i');
}

function isIgnored(relativePath, patterns) {
  const normalized = relativePath.split(path.sep).join('/');
  return patterns.some((pattern) => globToRegExp(pattern.replace(/^\//, '')).test(normalized));
}

async function readIgnoreFile(root) {
  try {
    const text = await fs.readFile(path.join(root, '.gitignore'), 'utf8');
    return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && !line.startsWith('!'));
  } catch {
    return [];
  }
}

export async function collectFiles(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const patterns = [...DEFAULT_IGNORES, ...(await readIgnoreFile(absoluteRoot)), ...(options.ignore ?? [])];
  const maxFileBytes = options.maxFileBytes ?? 200_000;
  const files = [];

  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(absoluteRoot, absolute);
      if (isIgnored(relative, patterns)) continue;
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        const stat = await fs.stat(absolute);
        if (stat.size > maxFileBytes) continue;
        const buffer = await fs.readFile(absolute);
        if (buffer.includes(0)) continue;
        files.push({ path: relative.split(path.sep).join('/'), content: buffer.toString('utf8'), bytes: stat.size });
      }
    }
  }

  await visit(absoluteRoot);
  return files;
}

export function redactSecrets(text) {
  return SECRET_PATTERNS.reduce((safe, [pattern, replacement]) => safe.replace(pattern, replacement), text);
}

function terms(query) {
  return [...new Set((query.toLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) ?? []))];
}

export function rankFiles(files, query = '') {
  const queryTerms = terms(query);
  return files.map((file) => {
    const lowerPath = file.path.toLowerCase();
    const sample = file.content.slice(0, 50_000).toLowerCase();
    const baseName = path.posix.basename(lowerPath);
    let score = HIGH_SIGNAL.get(baseName) ?? 0;
    if (/\.(test|spec)\.[^.]+$/.test(lowerPath)) score += 12;
    if (/(^|\/)src\//.test(lowerPath)) score += 10;
    if (/(^|\/)docs?\//.test(lowerPath)) score += 5;
    for (const term of queryTerms) {
      if (lowerPath.includes(term)) score += 18;
      const matches = sample.split(term).length - 1;
      score += Math.min(matches, 12) * 2;
    }
    score -= Math.log2(Math.max(file.bytes, 1)) / 2;
    return { ...file, score: Number(score.toFixed(2)) };
  }).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

export function renderBundle(files, metadata, format = 'markdown') {
  if (format === 'json') return JSON.stringify({ ...metadata, files: files.map(({ path: filePath, content }) => ({ path: filePath, content })) }, null, 2);
  if (format === 'xml') {
    const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<context query="${escape(metadata.query)}">\n${files.map((file) => `<file path="${escape(file.path)}">\n${escape(file.content)}\n</file>`).join('\n')}\n</context>\n`;
  }
  const header = [`# Repository context`, '', `Query: ${metadata.query || '(none)'}`, `Files: ${files.length}`, `Estimated tokens: ${metadata.estimatedTokens}`, ''];
  const sections = files.map((file) => `## ${file.path}\n\n\`\`\`${path.extname(file.path).slice(1)}\n${file.content}\n\`\`\``);
  return `${header.join('\n')}${sections.join('\n\n')}\n`;
}

export async function buildBundle(options = {}) {
  const root = options.root ?? process.cwd();
  const budget = Math.max(250, Number(options.budget ?? 16_000));
  const files = rankFiles(await collectFiles(root, options), options.query ?? '');
  const selected = [];
  let usedChars = 0;
  const charBudget = budget * 4;
  for (const file of files) {
    const safeContent = options.redact === false ? file.content : redactSecrets(file.content);
    const overhead = file.path.length + 40;
    if (usedChars + safeContent.length + overhead > charBudget) continue;
    selected.push({ ...file, content: safeContent });
    usedChars += safeContent.length + overhead;
  }
  const metadata = { query: options.query ?? '', budget, estimatedTokens: Math.ceil(usedChars / 4), scannedFiles: files.length };
  return { text: renderBundle(selected, metadata, options.format ?? 'markdown'), files: selected, metadata };
}
