#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { buildBundle } from './sieve.js';

function help() {
  console.log(`contextsieve — focused repository context for LLMs

Usage:
  contextsieve [path] --query "fix authentication" --budget 12000

Options:
  -q, --query <text>     Rank files for this task
  -b, --budget <tokens>  Approximate token ceiling (default: 16000)
  -o, --output <file>    Write output to a file
  -f, --format <type>    markdown, xml, or json
      --ignore <glob>    Additional ignore pattern (repeatable)
      --no-redact        Disable secret redaction (not recommended)
  -h, --help             Show help`);
}

function parse(argv) {
  const options = { ignore: [] };
  const args = [...argv];
  if (args[0] && !args[0].startsWith('-')) options.root = args.shift();
  while (args.length) {
    const flag = args.shift();
    if (flag === '-h' || flag === '--help') options.help = true;
    else if (flag === '-q' || flag === '--query') options.query = args.shift();
    else if (flag === '-b' || flag === '--budget') options.budget = Number(args.shift());
    else if (flag === '-o' || flag === '--output') options.output = args.shift();
    else if (flag === '-f' || flag === '--format') options.format = args.shift();
    else if (flag === '--ignore') options.ignore.push(args.shift());
    else if (flag === '--no-redact') options.redact = false;
    else throw new Error(`Unknown option: ${flag}`);
  }
  return options;
}

try {
  const options = parse(process.argv.slice(2));
  if (options.help) help();
  else {
    if (options.format && !['markdown', 'xml', 'json'].includes(options.format)) throw new Error('Format must be markdown, xml, or json');
    const result = await buildBundle(options);
    if (options.output) {
      await fs.writeFile(options.output, result.text);
      console.error(`Bundled ${result.files.length}/${result.metadata.scannedFiles} files (~${result.metadata.estimatedTokens} tokens) → ${options.output}`);
    } else process.stdout.write(result.text);
  }
} catch (error) {
  console.error(`contextsieve: ${error.message}`);
  process.exitCode = 1;
}
