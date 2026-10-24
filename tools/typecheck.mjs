// Runs tsc for every TypeScript project; exits with 1 if any project has errors.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const projects = ['tsconfig.json', 'tsconfig.core.json'];

let failed = false;
for (const project of projects) {
  const result = spawnSync(process.execPath, [tsc, '--noEmit', '-p', project], {
    cwd: root,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (result.status === 0) {
    console.log(`typecheck ${project}: ok`);
  } else if (/^error TS18003:/.test(output) && !output.includes('\n')) {
    // TS18003 = the project has no source files yet (e.g. an empty src/core); nothing to check.
    console.log(`typecheck ${project}: skipped (no source files)`);
  } else {
    failed = true;
    console.log(`typecheck ${project}: errors`);
    if (output) console.log(output);
    if (result.error) console.log(String(result.error));
  }
}

process.exit(failed ? 1 : 0);
