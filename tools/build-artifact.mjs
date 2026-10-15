// Gera dev/artifact/index.html: a mesma página no formato de Artifact do claude.ai
// (sem doctype/html/head/body, com <title> curto no topo). Os assets são publicados
// junto, nos mesmos caminhos relativos (assets/...).
//   node tools/build-artifact.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const head = src.match(/<head>([\s\S]*?)<\/head>/i)[1]
  .replace(/^\s*<meta charset=[^>]*>\s*$/im, '')
  .replace(/^\s*<meta name="viewport"[^>]*>\s*$/im, '')
  .replace(/<title>[\s\S]*?<\/title>/i, '');
const body = src.match(/<body>([\s\S]*?)<\/body>/i)[1];

const out = `<title>Vertisell</title>
<meta name="claude:viewport-fit-sides" content="cover">
${head.trim()}
${body.trim()}
`;
const dir = path.join(ROOT, 'dev', 'artifact');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), out);
console.log('ok', path.join(dir, 'index.html'), (out.length / 1024).toFixed(1) + ' KB');
