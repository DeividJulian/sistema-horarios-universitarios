// Keeps the frontend in line with the RPC contract (Protobuf).
//
//   node scripts/proto-contract.mjs gen    copies ../backend/proto (if present) and regenerates src/app/core/rpc/gen
//   node scripts/proto-contract.mjs check  fails if the copy of the .proto or the generated code are out of date
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROTO = join('horarios', 'v1', 'horarios.proto');
const local = join(root, 'proto', PROTO);
const backend = resolve(root, '..', 'backend', 'proto', PROTO);
const generated = join(root, 'src', 'app', 'core', 'rpc', 'gen');
const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

function generate(output) {
  const buf = join(root, 'node_modules', '@bufbuild', 'buf', 'bin', 'buf');
  const args = ['generate', ...(output ? ['-o', output] : [])];
  execFileSync(process.execPath, [buf, ...args], { cwd: root, stdio: 'inherit' });
}

const command = process.argv[2];

if (command === 'gen') {
  if (existsSync(backend)) {
    writeFileSync(local, read(backend));
    console.log('Contrato .proto copiado desde ../backend/proto');
  } else {
    console.log('No está ../backend: se usa la copia de proto/');
  }
  generate();
  console.log('Código TypeScript generado en src/app/core/rpc/gen');
} else if (command === 'check') {
  const problems = [];
  if (existsSync(backend) && read(backend) !== read(local)) problems.push('proto/ no coincide con ../backend/proto');
  const temp = mkdtempSync(join(tmpdir(), 'proto-check-'));
  try {
    generate(temp);
    const fresh = join(temp, 'src', 'app', 'core', 'rpc', 'gen');
    const names = new Set([...files(fresh).map((f) => relative(fresh, f)), ...files(generated).map((f) => relative(generated, f))]);
    for (const name of names) {
      const a = join(fresh, name);
      const b = join(generated, name);
      if (!existsSync(a) || !existsSync(b) || read(a) !== read(b)) problems.push(`src/app/core/rpc/gen/${name} está desactualizado`);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  if (problems.length) {
    console.error(problems.map((p) => `✗ ${p}`).join('\n') + '\nCorre `npm run gen:proto` y sube los cambios.');
    process.exit(1);
  }
  console.log('✓ El contrato .proto y su código generado están al día');
} else {
  console.error('Uso: node scripts/proto-contract.mjs gen|check');
  process.exit(2);
}
