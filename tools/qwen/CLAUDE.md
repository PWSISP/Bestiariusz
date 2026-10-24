# Bestiariusz — rules for the coding agent

You implement ONE task at a time. The prompt names the task, e.g. `S01-04`.

## Where things are

- Specification: `tasks/<task>.md`. Its line `File to edit: <path>` names the ONLY file you may change.
- Your file: the path from `File to edit:` — replace every `throw new Error('Not implemented')` body.
- Tests: `tests/<task>.test.ts` (the contract; read it).
- You may read and import any other file in `src/`.

## Rules

- Edit ONLY the file named in `File to edit:`. Never edit `tests/`, `tasks/`, other files in `src/`, configuration files, `package.json`, `package-lock.json` or this file, and never create or delete files. Any change outside your file fails the task.
- Keep every exported name, type and function signature from the stub exactly as it is.
- TypeScript in strict mode, ES modules.
- Imports between source files use the `.ts` extension, e.g. `import { createRng } from '../core/rng.ts'`.
- Type-only imports use `import type`, e.g. `import type { Rng } from '../core/rng.ts'`.
- Do not use enums, namespaces or constructor parameter properties (`erasableSyntaxOnly`).
- No new dependencies. No Node-specific APIs in `src/` (`node:*`, `process`, `Buffer`).
- Never use `Math.random`, `Date.now` or `new Date()` — the linter rejects them. Randomness comes from an injected `Rng`.
- Write pure functions: never modify the arguments.

## Check your work

- Tests: `node node_modules/vitest/vitest.mjs run tests/<task>.test.ts`
- Type check: `node tools/typecheck.mjs`
- Lint: `node node_modules/eslint/bin/eslint.js --max-warnings 0 <your file>`

The task is done only when all three pass with no errors. Run all three before you finish.
