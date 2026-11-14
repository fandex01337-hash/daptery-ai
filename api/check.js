// Серверная функция для Vercel: POST /api/check
// Ключ берётся из переменной окружения GEMINI_API_KEY (Project Settings → Environment Variables).
import { handleCheck, allowRequest, RATE_LIMITED } from '../lib/check.js';

export const config = { maxDuration: 120 };

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim();
  return first || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Только POST.' });
    return;
  }
  if (!allowRequest(clientIp(req), process.env)) {
    res.status(429).json(RATE_LIMITED);
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const [status, payload] = await handleCheck(body, process.env);
  res.status(status).json(payload);
}
