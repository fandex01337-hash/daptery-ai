// Серверная функция для Vercel: POST /api/check
// Ключ берётся из переменной окружения GEMINI_API_KEY (Project Settings → Environment Variables).
import { handleCheck } from '../lib/check.js';

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Только POST.' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const [status, payload] = await handleCheck(body, process.env);
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}
