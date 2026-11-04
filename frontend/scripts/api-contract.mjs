// Keeps the frontend in line with the backend contract.
//
//   node scripts/api-contract.mjs gen    copies ../backend/openapi.json (if present) and regenerates the types and Zod schemas
//   node scripts/api-contract.mjs check  fails if the generated code or the copy of the contract are out of date
//
// The copy of the contract lives in openapi/openapi.json so the frontend builds on its own (Vercel, CI) without the backend.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = join(root, 'openapi', 'openapi.json');
const backendContract = resolve(root, '..', 'backend', 'openapi.json');
const generated = join(root, 'src', 'app', 'core', 'api', 'generated');
const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

function generate(output) {
  const cli = join(root, 'node_modules', '@hey-api', 'openapi-ts', 'bin', 'run.js');
  const args = existsSync(cli) ? [cli] : [join(root, 'node_modules', '.bin', 'openapi-ts')];
  execFileSync(process.execPath, [...args, '-f', join(root, 'openapi-ts.config.ts'), '-s', ...(output ? ['-o', output] : [])], {
    cwd: root,
    stdio: 'inherit',
  });
}

const command = process.argv[2];

if (command === 'gen') {
  if (existsSync(backendContract)) {
    writeFileSync(contract, read(backendContract));
    console.log('Contrato copiado desde ../backend/openapi.json');
  } else {
    console.log('No está ../backend: se usa la copia de openapi/openapi.json');
  }
  generate();
  console.log('Tipos y esquemas Zod generados en src/app/core/api/generated');
} else if (command === 'check') {
  const problems = [];
  if (existsSync(backendContract) && read(backendContract) !== read(contract)) {
    problems.push('openapi/openapi.json no coincide con ../backend/openapi.json');
  }
  const temp = mkdtempSync(join(tmpdir(), 'api-check-'));
  try {
    generate(temp);
    const names = new Set([...readdirSync(temp), ...readdirSync(generated)]);
    for (const name of names) {
      const fresh = join(temp, name);
      const committed = join(generated, name);
      if (!existsSync(fresh) || !existsSync(committed) || read(fresh) !== read(committed)) {
        problems.push(`src/app/core/api/generated/${name} está desactualizado`);
      }
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  if (problems.length) {
    console.error(problems.map((p) => `✗ ${p}`).join('\n') + '\nCorre `npm run gen:api` y sube los cambios.');
    process.exit(1);
  }
  console.log('✓ El contrato y el código generado están al día');
} else {
  console.error('Uso: node scripts/api-contract.mjs gen|check');
  process.exit(2);
}
