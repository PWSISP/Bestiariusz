#!/usr/bin/env node
// Bestiariusz — potok Qwena: model w Claude Code wykonuje zadanie z tasks/<ID>.md w izolowanej kopii repozytorium.
//
//   node tools/qwen-run.mjs --tasks S01-04 --apply   # Qwen przez Ollamę, po zaliczeniu plik trafia do repozytorium
//   node tools/qwen-run.mjs --help
//
// Każde zadanie dostaje świeżą kopię w runs/<data>/<ID>/work. Zaliczone, gdy przechodzą testy zadania (Vitest),
// typecheck, ESLint na pliku docelowym i żaden plik poza docelowym nie zmienił sumy SHA-256.
// Wyniki: results/<data>.md i .json

import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
let ROOT = path.resolve(TOOLS_DIR, '..');

const COPY_ITEMS = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.core.json',
  'vite.config.ts',
  'eslint.config.js',
  'src',
  'tests',
  'tasks',
  'tools/typecheck.mjs',
  // imported by tests/tools/assemble-site.test.ts; without it the typecheck of the copy fails
  'tools/assemble-site.ts',
];
const AGENT_GUIDE = 'tools/qwen/CLAUDE.md';

const VITEST_CMD = 'node node_modules/vitest/vitest.mjs run';
const TYPECHECK_CMD = 'node tools/typecheck.mjs';
const ESLINT_CMD = 'node node_modules/eslint/bin/eslint.js';
const ALLOWED_TOOLS = [
  'Read',
  'Edit',
  'Write',
  'Glob',
  'Grep',
  `Bash(${VITEST_CMD} *)`,
  `PowerShell(${VITEST_CMD} *)`,
  `Bash(${TYPECHECK_CMD})`,
  `PowerShell(${TYPECHECK_CMD})`,
  `Bash(${ESLINT_CMD} *)`,
  `PowerShell(${ESLINT_CMD} *)`,
].join(',');

// ---------- argumenty ----------

function parseArgs(argv) {
  const o = {
    model: 'qwen3-coder-64k',
    tasks: null,
    attempts: 2,
    apply: false,
    root: null,
    timeoutMin: 20,
    maxTurns: 40,
    ollamaUrl: 'http://localhost:11434',
    bare: true,
    claudeCmd: null,
    mock: null,
    log: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined) die(`Brak wartości dla ${a}`);
      return v;
    };
    switch (a) {
      case '--model':
        o.model = val();
        break;
      case '--tasks':
        o.tasks = val()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case '--attempts':
        o.attempts = Number(val());
        break;
      case '--apply':
        o.apply = true;
        break;
      case '--root':
        o.root = path.resolve(val());
        break;
      case '--timeout-min':
        o.timeoutMin = Number(val());
        break;
      case '--max-turns':
        o.maxTurns = Number(val());
        break;
      case '--ollama-url':
        o.ollamaUrl = val().replace(/\/+$/, '');
        break;
      case '--no-bare':
        o.bare = false;
        break;
      case '--claude-cmd':
        o.claudeCmd = val();
        break;
      case '--mock':
        o.mock = path.resolve(val());
        break;
      case '--log':
        o.log = path.resolve(val());
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        die(`Nieznana opcja: ${a} (pomoc: --help)`);
    }
  }
  if (!o.tasks || o.tasks.length === 0) die('Podaj zadania: --tasks <ID>[,<ID>] (pomoc: --help)');
  if (!(o.attempts >= 1)) die('--attempts musi być >= 1');
  return o;
}

function printHelp() {
  console.log(`Użycie: node tools/qwen-run.mjs --tasks <ID>[,<ID>] [opcje]

  --tasks S01-04,...        zadania do wykonania (wymagane); każde potrzebuje tasks/<ID>.md
                            z linią "File to edit: <ścieżka>" (lub "Plik do edycji:") i tests/<ID>.test.ts
  --attempts N              podejścia na zadanie: pierwsze + poprawki z wynikiem testów (domyślnie 2)
  --apply                   po zaliczeniu skopiuj plik docelowy do repozytorium
                            (tylko gdy w repozytorium nie zmienił się od startu)
  --root KATALOG            katalog repozytorium (domyślnie katalog nadrzędny tools/)
  --model NAZWA             model w Ollamie (domyślnie qwen3-coder-64k)
  --timeout-min N           limit czasu jednego podejścia w minutach (domyślnie 20)
  --max-turns N             limit tur agenta na podejście (domyślnie 40)
  --ollama-url URL          adres Ollamy (domyślnie http://localhost:11434)
  --no-bare                 nie używaj trybu --bare (wczyta twoje wtyczki i ustawienia Claude Code)
  --claude-cmd ŚCIEŻKA      ścieżka do programu claude, jeśli nie ma go w PATH
  --mock KATALOG            tryb próbny: zamiast modelu kopiuje <ID>.attempt<N>.ts albo <ID>.ts;
                            plik <ID>.tamper każe "agentowi" nadpisać tests/<ID>.test.ts
  --log PLIK                zapisuj też wszystko, co widać w oknie, do pliku (UTF-8)

Zasady potoku:
  - Agent dostaje świeżą kopię: ${COPY_ITEMS.join(', ')};
    ${AGENT_GUIDE} trafia do kopii jako CLAUDE.md, node_modules jest dowiązane.
  - Zaliczone, gdy: testy zadania zielone, typecheck czysty, ESLint --max-warnings 0 na pliku
    docelowym czysty i żaden plik poza docelowym nie zmienił sumy SHA-256 (dodany, usunięty
    i zmieniony liczą się jako naruszenie).
  - Narzędzia agenta: Read, Edit, Write, Glob, Grep i tylko trzy polecenia:
    ${VITEST_CMD} *, ${TYPECHECK_CMD}, ${ESLINT_CMD} *
  - Kod wyjścia: 0, gdy wszystkie zadania zaliczone, inaczej 1.`);
}

function setupLog(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'w');
  const tee = (stream) => {
    const original = stream.write.bind(stream);
    stream.write = (chunk, ...rest) => {
      try {
        fs.writeSync(fd, typeof chunk === 'string' ? chunk : Buffer.from(chunk));
      } catch {
        /* ignore */
      }
      return original(chunk, ...rest);
    };
  };
  tee(process.stdout);
  tee(process.stderr);
}

function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ---------- pomocnicze ----------

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const shaOrNull = (file) => (fs.existsSync(file) ? sha(file) : null);

function snapshot(workDir) {
  const map = new Map();
  for (const rel of walk(workDir)) map.set(rel, sha(path.join(workDir, rel)));
  return map;
}

function diffSnapshots(before, after) {
  const changed = [];
  for (const [rel, h] of before) {
    if (!after.has(rel)) changed.push({ file: rel, kind: 'usunięty' });
    else if (after.get(rel) !== h) changed.push({ file: rel, kind: 'zmieniony' });
  }
  for (const rel of after.keys()) if (!before.has(rel)) changed.push({ file: rel, kind: 'dodany' });
  return changed;
}

function nodeSupportsTypeStripping() {
  const [maj, min] = process.versions.node.split('.').map(Number);
  return maj > 23 || (maj === 23 && min >= 6) || (maj === 22 && min >= 18);
}

function quoteForCmd(arg) {
  if (arg === '') return '""';
  if (!/[\s"&|<>^()%!,;=]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""')}"`;
}

function resolveClaude(opts) {
  if (opts.claudeCmd) return opts.claudeCmd;
  const local = path.join(
    os.homedir(),
    '.local',
    'bin',
    process.platform === 'win32' ? 'claude.exe' : 'claude',
  );
  if (process.platform !== 'win32') {
    const r = spawnSync('which', ['claude'], { encoding: 'utf8' });
    return r.status === 0 ? 'claude' : fs.existsSync(local) ? local : 'claude';
  }
  const r = spawnSync('where', ['claude'], { encoding: 'utf8' });
  const found = (r.stdout || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    found.find((f) => /\.exe$/i.test(f)) ||
    found.find((f) => /\.(cmd|bat)$/i.test(f)) ||
    found[0] ||
    (fs.existsSync(local) ? local : 'claude')
  );
}

function runProcess(cmd, args, { cwd, env, input, timeoutMs }) {
  return new Promise((resolve) => {
    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd);
    const child = useShell
      ? spawn([cmd, ...args].map(quoteForCmd).join(' '), {
          cwd,
          env,
          shell: true,
          windowsHide: true,
        })
      : spawn(cmd, args, { cwd, env, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const started = Date.now();
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
    }, timeoutMs);
    currentChild = child;
    child.on('error', (err) => {
      stderr += `\n[spawn error] ${err.message}`;
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      currentChild = null;
      resolve({ code, stdout, stderr, timedOut, ms: Date.now() - started });
    });
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

let currentChild = null;

function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']);
    else process.kill(pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}

process.on('SIGINT', () => {
  if (currentChild) killTree(currentChild.pid);
  console.log('\nPrzerwano.');
  process.exit(130);
});

function parseAgentJson(stdout) {
  const text = stdout.trim();
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const lines = text.split(/\r?\n/).reverse();
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('{')) {
      try {
        return JSON.parse(t);
      } catch {
        /* keep looking */
      }
    }
  }
  return null;
}

function linkNodeModules(workDir) {
  // realpath: --root may itself point at a node_modules junction.
  const target = fs.realpathSync(path.join(ROOT, 'node_modules'));
  const link = path.join(workDir, 'node_modules');
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

// ---------- specyfikacja ----------

function parseSpec(id) {
  const specRel = `tasks/${id}.md`;
  const testRel = `tests/${id}.test.ts`;
  const specAbs = path.join(ROOT, specRel);
  if (!fs.existsSync(specAbs)) die(`Brak specyfikacji ${specRel}`);
  if (!fs.existsSync(path.join(ROOT, testRel))) die(`Brak testu ${testRel} dla zadania ${id}`);
  const text = fs.readFileSync(specAbs, 'utf8');
  const heading = (text.match(/^#\s+(.+)$/m)?.[1] ?? '').trim();
  const title = heading.startsWith(id)
    ? heading.slice(id.length).replace(/^[\s—–:-]+/, '')
    : heading;
  const target = text.match(/^(?:File to edit|Plik do edycji):\s*`?([^`\s]+)`?\s*$/m)?.[1];
  if (!target) {
    die(`${specRel}: brak linii "File to edit: <ścieżka>" (lub "Plik do edycji: <ścieżka>")`);
  }
  const targetRel = path.posix.normalize(target.replace(/\\/g, '/'));
  if (targetRel.startsWith('../') || path.isAbsolute(targetRel)) {
    die(`${specRel}: plik docelowy "${target}" musi leżeć w repozytorium`);
  }
  return { id, title, targetRel, testRel };
}

// ---------- ocena ----------

function runTests(workDir, taskId, jsonFile) {
  fs.rmSync(jsonFile, { force: true });
  const r = spawnSync(
    process.execPath,
    [
      'node_modules/vitest/vitest.mjs',
      'run',
      `tests/${taskId}.test.ts`,
      '--reporter=json',
      `--outputFile=${jsonFile}`,
    ],
    { cwd: workDir, encoding: 'utf8', timeout: 180_000 },
  );
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  let report = null;
  try {
    report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  } catch {
    /* vitest crashed before writing the report */
  }
  const pass = report?.numPassedTests ?? 0;
  const fail = report?.numFailedTests ?? 0;
  const ok = r.status === 0 && Boolean(report?.success) && fail === 0 && pass > 0;
  return { ok, pass, fail, report, output };
}

function runTypecheck(workDir) {
  const r = spawnSync(process.execPath, ['tools/typecheck.mjs'], {
    cwd: workDir,
    encoding: 'utf8',
    timeout: 180_000,
  });
  return { ok: r.status === 0, output: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

function runLint(workDir, targetRel) {
  if (!fs.existsSync(path.join(workDir, targetRel))) {
    return { ok: false, output: `${targetRel} does not exist` };
  }
  const r = spawnSync(
    process.execPath,
    ['node_modules/eslint/bin/eslint.js', '--max-warnings', '0', targetRel],
    { cwd: workDir, encoding: 'utf8', timeout: 180_000 },
  );
  return { ok: r.status === 0, output: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

function failureDigest(tests, types, lint) {
  const parts = [];
  if (!tests.ok) {
    const lines = [`Tests: ${tests.pass} passed, ${tests.fail} failed.`];
    const files = tests.report?.testResults ?? [];
    const failed = files
      .flatMap((f) => f.assertionResults ?? [])
      .filter((a) => a.status === 'failed')
      .slice(0, 5);
    for (const a of failed) {
      // Stack frames inside node_modules (the test runner) only distract the model.
      const messages = (a.failureMessages ?? []).map((m) =>
        m
          .split(/\r?\n/)
          .filter((l) => !/node_modules[\\/]|\(<anonymous>\)/.test(l))
          .join('\n'),
      );
      lines.push(`- ${a.fullName ?? a.title}`, ...messages.map((m) => `  ${m}`));
    }
    if (failed.length === 0) {
      const fileMessage = files.map((f) => f.message).find(Boolean);
      lines.push(fileMessage || tests.output.split(/\r?\n/).slice(-40).join('\n'));
    }
    parts.push(lines.join('\n'));
  }
  if (!types.ok) {
    parts.push(`Type check errors:\n${types.output.split(/\r?\n/).slice(0, 40).join('\n')}`);
  }
  if (!lint.ok) parts.push(`Lint errors:\n${lint.output.split(/\r?\n/).slice(0, 40).join('\n')}`);
  const text = parts.join('\n\n');
  return text.length > 6000 ? `${text.slice(0, 6000)}\n[...]` : text;
}

// ---------- agent ----------

function agentEnv(opts) {
  const env = { ...process.env };
  // Tryb --bare czyta tylko ANTHROPIC_API_KEY; bez niego Ollama zaleca ANTHROPIC_AUTH_TOKEN i pusty klucz.
  if (opts.bare) {
    delete env.ANTHROPIC_AUTH_TOKEN;
    env.ANTHROPIC_API_KEY = 'ollama';
  } else {
    env.ANTHROPIC_AUTH_TOKEN = 'ollama';
    env.ANTHROPIC_API_KEY = '';
  }
  Object.assign(env, {
    ANTHROPIC_BASE_URL: opts.ollamaUrl,
    ANTHROPIC_DEFAULT_OPUS_MODEL: opts.model,
    ANTHROPIC_DEFAULT_SONNET_MODEL: opts.model,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: opts.model,
    ANTHROPIC_SMALL_FAST_MODEL: opts.model,
    CLAUDE_CODE_SUBAGENT_MODEL: opts.model,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  });
  return env;
}

const checkCommands = (spec) => [
  `${VITEST_CMD} ${spec.testRel}`,
  TYPECHECK_CMD,
  `${ESLINT_CMD} --max-warnings 0 ${spec.targetRel}`,
];

function firstPrompt(spec) {
  const [tests, types, lint] = checkCommands(spec);
  return [
    `Implement task ${spec.id} in this project.`,
    `1. Read CLAUDE.md and tasks/${spec.id}.md.`,
    `2. Implement ${spec.targetRel}. Edit only ${spec.targetRel}.`,
    `3. Run the tests with: ${tests}`,
    `4. Run the type check with: ${types}`,
    `5. Run the linter with: ${lint}`,
    '6. Fix problems and repeat steps 3 to 5 until all three pass. Then stop.',
  ].join('\n');
}

function retryPrompt(spec, digest) {
  const [tests, types, lint] = checkCommands(spec);
  return [
    `Your previous attempt at task ${spec.id} did not pass.`,
    '',
    digest,
    '',
    `Fix ${spec.targetRel} (edit only ${spec.targetRel}). Re-read tasks/${spec.id}.md if needed.`,
    `Then run: ${tests}, ${types} and ${lint}, and repeat until all three pass.`,
  ].join('\n');
}

async function runAgent(opts, claudeCmd, workDir, spec, prompt) {
  if (opts.mock) return mockAgent(opts, workDir, spec);
  const args = [
    '-p',
    'Follow the instructions given on standard input.',
    '--model',
    opts.model,
    '--output-format',
    'json',
    '--max-turns',
    String(opts.maxTurns),
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    ALLOWED_TOOLS,
  ];
  if (opts.bare) args.push('--bare', '--append-system-prompt-file', 'CLAUDE.md');
  return runProcess(claudeCmd, args, {
    cwd: workDir,
    env: agentEnv(opts),
    input: prompt,
    timeoutMs: opts.timeoutMin * 60_000,
  });
}

// Tryb próbny do sprawdzenia samego skryptu: kopiuje gotowe pliki zamiast wołać model.
const mockCalls = new Map();
async function mockAgent(opts, workDir, spec) {
  const n = (mockCalls.get(spec.id) ?? 0) + 1;
  mockCalls.set(spec.id, n);
  const perAttempt = path.join(opts.mock, `${spec.id}.attempt${n}.ts`);
  const anyAttempt = path.join(opts.mock, `${spec.id}.ts`);
  const src = fs.existsSync(perAttempt)
    ? perAttempt
    : fs.existsSync(anyAttempt)
      ? anyAttempt
      : null;
  if (src) {
    const target = path.join(workDir, spec.targetRel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(src, target);
  }
  if (fs.existsSync(path.join(opts.mock, `${spec.id}.tamper`))) {
    fs.writeFileSync(
      path.join(workDir, spec.testRel),
      "import { test } from 'vitest';\ntest('x', () => {});\n",
    );
  }
  const json = JSON.stringify({
    type: 'result',
    is_error: false,
    num_turns: 3,
    duration_ms: 1000,
    total_cost_usd: 0,
    result: 'mock',
  });
  return { code: 0, stdout: json, stderr: '', timedOut: false, ms: 5 };
}

// ---------- sprawdzenia wstępne ----------

async function preflight(opts, claudeCmd) {
  const info = { node: process.versions.node };
  if (!nodeSupportsTypeStripping()) {
    die(
      `Potrzebny Node.js 22.18 lub nowszy (masz ${process.versions.node}). Zainstaluj aktualną wersję LTS z nodejs.org.`,
    );
  }
  if (!fs.existsSync(path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'))) {
    die(`Brak node_modules/vitest w ${ROOT}. Uruchom: npm ci`);
  }
  for (const item of [...COPY_ITEMS, AGENT_GUIDE]) {
    if (!fs.existsSync(path.join(ROOT, item))) die(`Brak ${item} w ${ROOT}`);
  }
  if (opts.mock) return { ...info, claude: 'próbny', ollama: 'próbny' };

  const v = await runProcess(claudeCmd, ['--version'], {
    cwd: ROOT,
    env: process.env,
    timeoutMs: 60_000,
  });
  if (v.code !== 0) {
    die(
      `Nie mogę uruchomić Claude Code (${claudeCmd}). Sprawdź instalację albo podaj --claude-cmd.\n${v.stderr}`,
    );
  }
  info.claude = v.stdout.trim();

  let tags;
  try {
    const ver = await (await fetch(`${opts.ollamaUrl}/api/version`)).json();
    info.ollama = ver.version;
    tags = await (await fetch(`${opts.ollamaUrl}/api/tags`)).json();
  } catch (e) {
    die(`Ollama nie odpowiada pod ${opts.ollamaUrl}. Uruchom Ollamę. (${e.message})`);
  }
  const names = (tags.models || []).map((m) => m.name);
  const has = names.some((n) => n === opts.model || n === `${opts.model}:latest`);
  if (!has) {
    die(
      `W Ollamie nie ma modelu "${opts.model}". Dostępne: ${names.join(', ') || 'brak'}.\n` +
        'Utwórz go skryptem: powershell -ExecutionPolicy Bypass -File tools\\setup-ollama.ps1',
    );
  }
  const [maj, min] = String(info.ollama || '0.0')
    .split('.')
    .map(Number);
  if (maj === 0 && min < 14) {
    die(
      `Ollama ${info.ollama} jest za stara: zgodność z Claude Code wymaga wersji 0.14 lub nowszej.`,
    );
  }
  return info;
}

async function ollamaPlacement(opts) {
  try {
    const ps = await (await fetch(`${opts.ollamaUrl}/api/ps`)).json();
    const m = (ps.models || []).find(
      (x) => x.name === opts.model || x.name === `${opts.model}:latest` || x.model === opts.model,
    );
    if (!m) return null;
    return {
      sizeGB: +(m.size / 1e9).toFixed(1),
      vramGB: +(m.size_vram / 1e9).toFixed(1),
      gpuPct: m.size ? Math.round((m.size_vram / m.size) * 100) : null,
      context: m.context_length ?? null,
    };
  } catch {
    return null;
  }
}

// ---------- raport ----------

const fmtS = (ms) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
};

const verdict = (r) =>
  r.pass
    ? r.attempts.length === 1
      ? 'zaliczone'
      : `zaliczone w ${r.attempts.length}. podejściu`
    : 'niezaliczone';

function writeReport(opts, info, results, runStamp) {
  fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true });
  const base = path.join(ROOT, 'results', runStamp);
  fs.writeFileSync(
    `${base}.json`,
    JSON.stringify({ opts: { ...opts, mock: undefined }, info, results }, null, 2),
  );

  const firstTry = results.filter((r) => r.attempts[0]?.pass).length;
  const passed = results.filter((r) => r.pass).length;
  const totalMs = results.reduce((s, r) => s + r.attempts.reduce((a, x) => a + x.ms, 0), 0);
  const lines = [];
  lines.push(`# Potok Qwena — ${opts.model}${opts.mock ? ' (tryb próbny)' : ''}`, '');
  lines.push(`- Data: ${runStamp.replace(/_(\d\d)(\d\d)(\d\d)$/, ' $1:$2:$3')}`);
  lines.push(
    `- Claude Code: ${info.claude ?? '?'}; Node.js: ${info.node}${info.ollama ? `; Ollama: ${info.ollama}` : ''}`,
  );
  if (info.placement) {
    const p = info.placement;
    lines.push(
      `- Model w pamięci: ${p.sizeGB} GB, z czego na GPU ${p.vramGB} GB (${p.gpuPct}%)${p.context ? `, kontekst ${p.context}` : ''}`,
    );
  }
  lines.push(
    `- Podejść na zadanie: ${opts.attempts}; limit tur: ${opts.maxTurns}; tryb --bare: ${opts.bare ? 'tak' : 'nie'}; --apply: ${opts.apply ? 'tak' : 'nie'}`,
    '',
  );
  lines.push(
    `**Zaliczone za pierwszym podejściem: ${firstTry}/${results.length}. Zaliczone łącznie: ${passed}/${results.length}. Łączny czas: ${fmtS(totalMs)}.**`,
    '',
  );
  lines.push('| Zadanie | Wynik | Podejścia | Testy | Typy | Lint | Czas | Tury | Uwagi |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of results) {
    const last = r.attempts[r.attempts.length - 1];
    const notes = [];
    if (r.attempts.some((a) => a.timedOut)) notes.push('przekroczony czas');
    if (r.attempts.every((a) => !a.targetChanged)) notes.push('plik docelowy bez zmian');
    if (r.attempts.some((a) => a.isError)) notes.push('błąd agenta');
    const tampered = [...new Set(r.attempts.flatMap((a) => a.tampered))];
    if (tampered.length) notes.push(`zmiany poza plikiem docelowym: ${tampered.join(', ')}`);
    if (r.applied) notes.push(r.applied);
    const turns = r.attempts.map((a) => a.turns ?? '?').join(' + ');
    const ms = r.attempts.reduce((s, a) => s + a.ms, 0);
    lines.push(
      `| ${r.id} ${r.title} | ${verdict(r)} | ${r.attempts.length} | ${last.testsPass}/${last.testsPass + last.testsFail} | ${last.typesOk ? 'OK' : 'błędy'} | ${last.lintOk ? 'OK' : 'błędy'} | ${fmtS(ms)} | ${turns} | ${notes.join('; ')} |`,
    );
  }
  lines.push('', 'Pełne zapisy pracy modelu są w katalogu runs/.', '');
  fs.writeFileSync(`${base}.md`, lines.join('\n'));
  return {
    md: `${base}.md`,
    json: `${base}.json`,
    firstTry,
    passed,
    total: results.length,
    totalMs,
  };
}

// ---------- główna pętla ----------

function applyResult(spec, workDir, startSha) {
  const repoFile = path.join(ROOT, spec.targetRel);
  if (shaOrNull(repoFile) !== startSha) {
    return `nie skopiowano: ${spec.targetRel} w repozytorium zmienił się w trakcie pracy`;
  }
  fs.mkdirSync(path.dirname(repoFile), { recursive: true });
  fs.copyFileSync(path.join(workDir, spec.targetRel), repoFile);
  return `skopiowano do repozytorium: ${spec.targetRel}`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.root) ROOT = opts.root;
  if (opts.log) setupLog(opts.log);
  const specs = opts.tasks.map(parseSpec);

  const claudeCmd = resolveClaude(opts);
  const info = await preflight(opts, claudeCmd);
  const runStamp = stamp();
  const runRoot = path.join(ROOT, 'runs', runStamp);
  fs.mkdirSync(runRoot, { recursive: true });

  console.log(
    `\nBestiariusz — potok Qwena: ${opts.model}, zadań: ${specs.length}, podejść: ${opts.attempts}${opts.mock ? ' (tryb próbny)' : ''}`,
  );
  console.log(
    `Claude Code: ${info.claude ?? '?'}${info.ollama ? ` | Ollama: ${info.ollama}` : ''} | Node.js: ${info.node}\n`,
  );

  const results = [];
  for (const spec of specs) {
    const taskRoot = path.join(runRoot, spec.id);
    const workDir = path.join(taskRoot, 'work');
    const logDir = path.join(taskRoot, 'logs');
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(logDir, { recursive: true });
    for (const item of COPY_ITEMS) {
      fs.cpSync(path.join(ROOT, item), path.join(workDir, item), { recursive: true });
    }
    fs.copyFileSync(path.join(ROOT, AGENT_GUIDE), path.join(workDir, 'CLAUDE.md'));
    linkNodeModules(workDir);
    const before = snapshot(workDir);
    const startSha = before.get(spec.targetRel) ?? null;
    const targetAbs = path.join(workDir, spec.targetRel);

    const result = { id: spec.id, title: spec.title, target: spec.targetRel, pass: false };
    result.attempts = [];
    let prompt = firstPrompt(spec);
    for (let n = 1; n <= opts.attempts; n++) {
      process.stdout.write(`${spec.id} — podejście ${n}… `);
      const run = await runAgent(opts, claudeCmd, workDir, spec, prompt);
      fs.writeFileSync(path.join(logDir, `attempt${n}.prompt.txt`), prompt);
      fs.writeFileSync(path.join(logDir, `attempt${n}.stdout.txt`), run.stdout);
      fs.writeFileSync(path.join(logDir, `attempt${n}.stderr.txt`), run.stderr);
      const agent = parseAgentJson(run.stdout);

      // Snapshot before evaluation, so files written by the checks cannot count against the agent.
      const afterSnap = snapshot(workDir);
      const tests = runTests(workDir, spec.id, path.join(logDir, `attempt${n}.tests.json`));
      const types = runTypecheck(workDir);
      const lint = runLint(workDir, spec.targetRel);
      fs.writeFileSync(path.join(logDir, `attempt${n}.tests.txt`), tests.output);
      fs.writeFileSync(path.join(logDir, `attempt${n}.types.txt`), types.output);
      fs.writeFileSync(path.join(logDir, `attempt${n}.lint.txt`), lint.output);
      if (fs.existsSync(targetAbs)) {
        fs.copyFileSync(targetAbs, path.join(logDir, `attempt${n}.solution.ts`));
      }
      const targetChanged = afterSnap.get(spec.targetRel) !== before.get(spec.targetRel);
      const tampered = diffSnapshots(before, afterSnap)
        .filter((c) => c.file !== spec.targetRel)
        .map((c) => `${c.file} (${c.kind})`);
      const pass = tests.ok && types.ok && lint.ok && tampered.length === 0;

      result.attempts.push({
        n,
        pass,
        ms: run.ms,
        exitCode: run.code,
        timedOut: run.timedOut,
        isError: agent ? Boolean(agent.is_error) : run.code !== 0,
        turns: agent?.num_turns ?? null,
        costUsd: agent?.total_cost_usd ?? null,
        testsPass: tests.pass,
        testsFail: tests.fail,
        testsOk: tests.ok,
        typesOk: types.ok,
        lintOk: lint.ok,
        tampered,
        targetChanged,
        targetSha: afterSnap.get(spec.targetRel) ?? null,
      });
      const flags = [
        `testy ${tests.pass}/${tests.pass + tests.fail}`,
        `typy ${types.ok ? 'OK' : 'błędy'}`,
        `lint ${lint.ok ? 'OK' : 'błędy'}`,
      ];
      if (tampered.length) flags.push(`ZMIANY POZA PLIKIEM DOCELOWYM: ${tampered.join(', ')}`);
      if (!targetChanged) flags.push('plik docelowy bez zmian');
      if (run.timedOut) flags.push('przekroczony czas');
      flags.push(fmtS(run.ms));
      if (agent?.num_turns) flags.push(`${agent.num_turns} tur`);
      console.log(`${pass ? 'zaliczone' : 'niezaliczone'} (${flags.join(', ')})`);
      if (!agent && !opts.mock) {
        const tail = (run.stderr || run.stdout).trim().split(/\r?\n/).slice(-3).join(' | ');
        console.log(`   uwaga: brak odpowiedzi JSON od Claude Code (kod ${run.code}). ${tail}`);
      }
      if (pass) {
        result.pass = true;
        break;
      }
      if (tampered.length) break;
      prompt = retryPrompt(spec, failureDigest(tests, types, lint));
    }
    if (result.pass && opts.apply) {
      result.applied = applyResult(spec, workDir, startSha);
      console.log(`   ${result.applied}`);
    }
    results.push(result);
    if (!opts.mock && !info.placement) info.placement = await ollamaPlacement(opts);
  }

  const rep = writeReport(opts, info, results, runStamp);
  for (const r of results) console.log(`${r.id} ${r.title}: ${verdict(r)}`);
  console.log(
    `\nZaliczone za pierwszym podejściem: ${rep.firstTry}/${rep.total}, łącznie: ${rep.passed}/${rep.total}, czas: ${fmtS(rep.totalMs)}`,
  );
  if (info.placement) {
    console.log(
      `Model w pamięci: ${info.placement.vramGB}/${info.placement.sizeGB} GB na GPU (${info.placement.gpuPct}%)`,
    );
  }
  console.log(`Raport: ${path.relative(process.cwd(), rep.md)}\n`);
  const allApplied = !opts.apply || results.every((r) => r.applied?.startsWith('skopiowano'));
  process.exit(rep.passed === rep.total && allApplied ? 0 : 1);
}

main().catch((e) => die(e.stack || String(e)));
