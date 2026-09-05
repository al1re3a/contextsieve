<!-- readme-refresh:start -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme-banner.png">
    <source media="(prefers-color-scheme: light)" srcset="assets/readme-banner.png">
    <img alt="ContextSieve project banner" src="assets/readme-banner.png" width="100%">
  </picture>
</p>

<h1 align="center">🧺 ContextSieve</h1>

<p align="center"><strong>Turn a repository into focused, secret-aware context for coding agents.</strong></p>

<p align="center">
  <a href="https://github.com/al1re3a/contextsieve/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/al1re3a/contextsieve/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://nodejs.org/"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-fbbf24.svg"></a>
  <a href="https://github.com/al1re3a/contextsieve/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/al1re3a/contextsieve?style=flat&color=8b5cf6"></a>
  <a href="https://github.com/al1re3a/contextsieve/issues"><img alt="Open issues" src="https://img.shields.io/github/issues/al1re3a/contextsieve?style=flat&color=06b6d4"></a>
</p>

<p align="center">
  <a href="https://github.com/al1re3a/contextsieve"><img alt="Source" src="https://img.shields.io/badge/Source-open-111827?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="#usage"><img alt="Quick Start" src="https://img.shields.io/badge/Quick_Start-open-0f766e?style=for-the-badge&logo=gnubash&logoColor=white"></a>
  <a href="CONTRIBUTING.md"><img alt="Contribute" src="https://img.shields.io/badge/Contribute-open-7c3aed?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="SECURITY.md"><img alt="Security" src="https://img.shields.io/badge/Security-open-b91c1c?style=for-the-badge&logo=securityscorecard&logoColor=white"></a>
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=nodejs,githubactions" alt="Node.js and GitHub Actions" height="42">
</p>

> [!NOTE]
> Secret filtering is a defensive layer, not a guarantee. Review generated context before sending it to another service.

## 📑 Contents

- [At a glance](#-at-a-glance)
- [Why](#why)
- [Features](#features)
- [Usage](#usage)
- [API](#api)
- [Development](#development)
- [Roadmap](#roadmap)

---

## 🔎 At a glance

| | |
|---|---|
| **Purpose** | Turn any repository into focused, secret-safe context for coding agents and LLMs. |
| **Input** | Repository tree |
| **Output** | Focused context bundle |
| **Runtime** | Node.js 20+ |
| **CI** | ✅ Linux |
| **Status** | ✅ Maintained |

<details>
<summary><strong>🧭 How it works</strong></summary>

```mermaid
flowchart LR
    A["Repository tree"] --> B["Filter and rank"]
    B --> C["Focused context bundle"]
```

</details>

<details>
<summary><strong>📁 Repository layout</strong></summary>

```text
contextsieve/
├── .github/
├── src/
├── test/
├── package.json
└── README.md
```

</details>

<details>
<summary><strong>🤝 Contributors</strong></summary>

<br>
<a href="https://github.com/al1re3a/contextsieve/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=al1re3a/contextsieve" alt="Contributors">
</a>

</details>
<!-- readme-refresh:end -->

**Give AI the files it needs — not your whole repository.**

ContextSieve is a zero-dependency CLI that ranks repository files for a task, fits the best ones inside a token budget, and redacts common secrets before producing Markdown, XML, or JSON.

```bash
npx contextsieve . --query "fix OAuth callback loop" --budget 12000 -o context.md
```

## Why

Dumping an entire repository into an agent is slow, expensive, and risky. ContextSieve uses a deterministic relevance score based on filenames, project structure, task terms, tests, and manifests. The output is reproducible and inspectable—no model or API key required.

## Features

- Task-aware file ranking
- Hard approximate token ceiling
- Secret redaction on by default
- `.gitignore` plus custom ignore patterns
- Markdown, XML, and JSON output
- Binary and oversized-file detection
- Works offline with zero runtime dependencies

## Usage

```bash
# Pipe context into another tool
contextsieve ./my-app -q "trace checkout failures" | your-llm-cli

# XML is convenient for models that understand tagged context
contextsieve . -q "review database migrations" -f xml -b 24000

# Add project-specific exclusions
contextsieve . --ignore fixtures --ignore "*.generated.ts"
```

Secret redaction catches common API keys, GitHub tokens, AWS access keys, bearer credentials, and credential-like assignments. It is a safety net, not a guarantee—always inspect context before sharing it.

## API

```js
import { buildBundle } from 'contextsieve';

const { text, files, metadata } = await buildBundle({
  root: '.',
  query: 'add rate limiting',
  budget: 16_000,
  format: 'markdown'
});
```

## Development

```bash
npm test
npm run check
```

## Roadmap

- AST-aware symbol extraction
- Git-diff relevance boost
- Language-specific compactors
- Editor extensions

Contributions and real-world ranking examples are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
