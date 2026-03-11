# Contributing to @page-speed/router

Thanks for contributing to OpenSite. This guide outlines how to work on the hooks library.

## Code of Conduct

Be respectful, inclusive, and constructive. We care about a welcoming developer community.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 9+
- Git

### Development Setup

```bash
git clone https://github.com/opensite-ai/page-speed-router.git
cd page-speed-router
pnpm install
```

### Common Commands

```bash
# Watch the build
pnpm run build:watch

# Run tests
pnpm test

# Lint
pnpm lint

# Build (ESM + CJS + UMD)
pnpm run build
```

## Contributing Workflow

### 1. Report Issues

Open a bug report or feature request:
https://github.com/opensite-ai/page-speed-router/issues/new

Please include:

- Steps to reproduce
- Expected vs actual behavior
- Environment (browser, Node.js)
- Minimal code sample

### 2. Propose Changes

Before large changes, open a discussion:

https://github.com/opensite-ai/page-speed-router/discussions

### 3. Pull Requests

1. Fork the repo and create a feature branch.
2. Keep changes small and focused.
3. Add or update tests when behavior changes.
4. Ensure `pnpm run build` passes.

## Coding Standards

- TypeScript strict mode.
- Prefer tree-shakable, granular exports.
- Avoid unnecessary dependencies.
- Maintain SSR-safe behavior.
- Optimize for low bundle size.

## License

By contributing, you agree that your contributions will be licensed under the BSD 3-Clause License.
