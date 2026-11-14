// Локальный сервер без зависимостей: раздаёт public/ и обрабатывает POST /api/check.
// Запуск: node server.js  (нужен Node.js 18+ и GEMINI_API_KEY в окружении или в файле .env)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleCheck } from './lib/check.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');

// Простая загрузка .env (без пакета dotenv).
const envFile = path.join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 8 * 1024 * 1024;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/check') {
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Только POST.' });
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      return send(res, e.status || 400, { ok: false, code: 'bad_request', error: e.status === 413 ? 'Фото слишком большое.' : 'Некорректный запрос.' });
    }
    const started = Date.now();
    const [status, payload] = await handleCheck(body, process.env);
    const u = payload.result?.usage;
    const tokens = u && u.input != null ? `, токены: вход ${u.input}, ответ ${u.output ?? 0}, размышления ${u.thinking ?? 0}` : '';
    console.log(`POST /api/check → ${status} за ${((Date.now() - started) / 1000).toFixed(1)} с${payload.result ? ` (${payload.result.model}${tokens})` : ''}`);
    return send(res, status, payload);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
  let file = path.normalize(path.join(publicDir, decodeURIComponent(url.pathname)));
  if (!file.startsWith(publicDir)) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const data = await readFile(file);
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
});

server.listen(PORT, () => {
  console.log(`Дәптер AI: http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.warn('Внимание: GEMINI_API_KEY не задан — проверка работ будет недоступна.');
});
